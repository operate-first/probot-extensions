import { parse as parseYaml } from 'yaml';

type File = {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  raw: string;
};

type BodyBase<TAttributes> = {
  id?: string;
  attributes: TAttributes;
  validations?: {
    required?: boolean;
  };
};

type CheckboxBody = {
  type: 'checkboxes';
} & BodyBase<{
  label: string;
  description?: string;
  options: {
    label: string;
    required?: boolean;
  }[];
}>;

type DropdownBody = {
  type: 'dropdown';
} & BodyBase<{
  label: string;
  description?: string;
  multiple?: boolean;
  options: string[];
}>;

type InputBody = {
  type: 'input';
} & BodyBase<{
  label: string;
  description?: string;
  placeholder?: string;
  value?: string;
}>;

type TextAreaBody = {
  type: 'textarea';
} & BodyBase<{
  label: string;
  description?: string;
  placeholder?: string;
  value?: string;
  render?: string;
}>;

type MarkdownBody = {
  type: 'markdown';
} & BodyBase<{
  label?: string;
  value: string;
}>;

export type Body =
  | CheckboxBody
  | DropdownBody
  | InputBody
  | TextAreaBody
  | MarkdownBody;

type Template = {
  name: string;
  description: string;
  title?: string;
  body: Body[];
  assignees?: Array<string> | string;
  labels?: Array<string> | string;
};

type OneOfBody = Extract<Body, { type: Body['type'] }>;

/**
 * Match individual value on issue
 * @param item Current issue template body entry that is being parsed.
 * @param originalText Issue text
 * @param nextItem Next issue template body entry or undefined if the `item` was last
 * @returns An array containing remaining text to parse on the issue on index 0 and a
 *          map of key: value pair matched from the issue body.
 */
export const match = (
  item: OneOfBody,
  originalText: string,
  nextItem: OneOfBody | undefined
): [string, { [key: string]: string | string[] }] => {
  const key =
    item.id || item.attributes.label?.replace(/\s+/g, '-').toLowerCase();

  if (!key || !item.attributes.label) {
    throw new Error('Key not found in template');
  }
  const text = originalText.replaceAll('\n', '\\n');

  // If there's a next item, match until it's label is found. In case there's no next item
  // match until the end.
  const regex = new RegExp(
    nextItem
      ? `^### ${item.attributes.label}\\\\n\\\\n(?<text>([^])*?)(\\\\n)*(?=### ${nextItem.attributes.label})`
      : `^### ${item.attributes.label}\\\\n\\\\n(?<text>([^])*)$`
  );

  const matches = regex.exec(text);

  if (
    !matches ||
    !matches.length ||
    !matches?.groups?.text ||
    (['dropdown', 'input'].includes(item.type) &&
      matches.groups.text.includes('\\n'))
  ) {
    throw new Error(`No match found for ${item.attributes.label}`);
  }

  // Remove the match from the end of the text
  const nextText = text.slice(matches[0].length).replaceAll('\\n', '\n');
  const value = matches.groups.text.replaceAll('\\n', '\n');

  // "_No response" is left by dropdown, textarea or input if no value is set.
  // If nothing is set, "checkboxes" outputs all options with not selected checkboxes
  // This has to be handled when parsing values
  if (value === '_No response_') {
    switch (item.type) {
      case 'dropdown':
        return [nextText, { [key]: [] }];
      default:
        return [nextText, { [key]: '' }];
    }
  }

  switch (item.type) {
    case 'checkboxes':
      // Filter selected values only
      return [
        nextText,
        {
          [key]: value.split('\n').reduce((acc, i) => {
            if (i.startsWith('- [X] ')) {
              acc.push(i.replace(/^- \[X\] /, ''));
            }
            return acc;
          }, [] as string[]),
        },
      ];
    case 'dropdown':
      // Coma is used to separate individual values (if `multiple` option is truthy),
      // however the same letter can be present in each option as well. We need to properly
      // check for option presence.
      return [
        nextText,
        { [key]: item.attributes.options.filter((o) => value.includes(o)) },
      ];
    case 'textarea':
      // if render == true, value is wrapped in "```true" on the first line and
      // "```" on last, omit those lines
      if (item.attributes.render) {
        const lines = value.split('\n');
        return [
          nextText,
          { [key]: lines.slice(1, lines.length - 1).join('\n') },
        ];
      } else {
        return [nextText, { [key]: value }];
      }
    default:
      return [nextText, { [key]: value }];
  }
};

/**
 * Fetch all YAML issue templates for given repo
 * @param context Probot context on `issue.created` event
 * @returns All YAML issue templates found in given git repo.
 */
export const fetchTemplates = async (context: any): Promise<File[]> => {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;

  const isYamlFile = (f: File) => f.name.match(/.*\.ya?ml/);

  const fetchFileContent = async (f: File) => ({
    ...f,
    raw: await context.octokit
      .request(`GET ${f.download_url}`)
      .then((r: Record<string, unknown>) => r.data)
      .catch(() => ''),
  });

  return context.octokit.repos
    .getContent({
      owner,
      repo,
      path: '.github/ISSUE_TEMPLATE',
    })
    .then(async (r: Record<string, unknown>) =>
      Promise.all(
        (r.data as Array<File>).filter(isYamlFile).map(fetchFileContent)
      )
    )
    .catch(() => []);
};

/**
 * Parse issue template into a javascript object
 * @param context Probot context for `issue.created` event
 * @returns Promise that resolves to a map where keys are IDs (or labels) from
 *          issue template fields and values are data from the issue
 */
export const parse = async (
  context: any
): Promise<Record<string, string | string[]>> => {
  const body = context.payload.issue.body || '';
  const templates = (await fetchTemplates(context))
    .map((f) => ({
      file: f,
      template: parseYaml(f.raw) as Template,
    }))
    .sort((a, b) => b.template.body.length - a.template.body.length);

  let parsed = {};

  for (const idx in templates) {
    try {
      let iterBody = body;
      parsed = templates[idx].template.body
        // "markdown" type can be ignored
        .filter((item) => item.type !== 'markdown')
        // Collect each item from parser
        .reduce((acc, item, idx, src) => {
          const nextItem = (idx < src.length - 1 && src[idx + 1]) || undefined;
          const [nextBody, map] = match(item, iterBody, nextItem);
          iterBody = nextBody;
          return {
            ...acc,
            ...map,
          };
        }, {});
    } catch (e: any) {
      // match() function throws exception in case there's no label for given field in the issue.
      // This means the issue was not created via this template and we should continue iterating through templates.
      context.log.debug("This template doesn't match", e, {
        template: templates[idx].file.name,
      });
      parsed = {};
      continue;
    }
    // No exception was risen, that means we found a template which matches all the fields found in a template
    break;
  }
  if (!parsed) {
    throw new Error(
      'No template matches this issue body. Issue was probably created using something else than Issue Forms'
    );
  }
  return parsed;
};
