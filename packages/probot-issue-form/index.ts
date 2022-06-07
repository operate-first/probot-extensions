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
};

type BodyBase = {
  id?: 'string';
  validations?: {
    required?: boolean;
  };
};

type CheckboxBody = BodyBase & {
  type: 'checkboxes';
  attributes: {
    label: string;
    description?: string;
    options: {
      label: string;
      required?: boolean;
    }[];
  };
};

type DropdownBody = BodyBase & {
  type: 'dropdown';
  attributes: {
    label: string;
    description?: string;
    multiple?: boolean;
    options: string[];
  };
};

type InputBody = BodyBase & {
  type: 'input';
  attributes: {
    label: string;
    description?: string;
    placeholder?: string;
    value?: string;
  };
};

type TextAreaBody = BodyBase & {
  type: 'textarea';
  attributes: {
    label: string;
    description?: string;
    placeholder?: string;
    value?: string;
    render?: string;
  };
};

type MarkdownBody = BodyBase & {
  type: 'markdown';
  attributes: {
    label?: string;
    value: string;
  };
};

type Body =
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

const match = (item: Body, text: string, nextItem: Body | undefined) => {
  const key = item.id || item.attributes.label?.replace(/\s+/g, '-');

  if (!key || !item.attributes.label) {
    throw new Error('Key not found in in template');
  }

  // If there's a next item, match until it's label is found. In case there's no next item
  // match until the end.
  const regex = new RegExp(
    nextItem
      ? `### ${item.attributes.label}(\\r?\\n)*(?<text>([^])*?)(?=\\r?\\n\\r?\\n### ${nextItem.attributes.label})`
      : `### ${item.attributes.label}(\\r?\\n)*(?<text>([^])*)`,
    'gm'
  );

  const matches = regex.exec(text);

  if (!matches || !matches.length || !matches?.groups?.text) {
    throw new Error(`No match found for ${item.attributes.label}`);
  }

  // "_No response" is left by dropdown, textarea or input if no value is set.
  // If nothing is set, "checkboxes" outputs all options with not selected checkboxes
  // This has to be handled when parsing values
  if (matches.groups.text === '_No response_') {
    switch (item.type) {
      case 'dropdown':
        return { [key]: [] };
      default:
        return { [key]: '' };
    }
  }

  switch (item.type) {
    case 'checkboxes':
      // Filter selected values only
      return {
        [key]: matches.groups.text.split('\n').reduce((acc, i) => {
          if (i.startsWith('- [X] ')) {
            acc.push(i.replace(/^- \[X\] /, ''));
          }
          return acc;
        }, [] as string[]),
      };
    case 'dropdown':
      // Selected values (if multiple == true) are separated by ", "
      return { [key]: matches.groups.text.split(', ') };
    case 'textarea':
      // if render == true, value is wrapped in "```true" on the first line and
      // "```" on last, omit those lines
      if (item.attributes.render) {
        const lines = matches.groups.text.split('\n');
        return { [key]: lines.slice(1, lines.length - 2) };
      } else {
        return { [key]: matches.groups.text };
      }
    default:
      return { [key]: matches.groups.text };
  }
};

export const parse = async (context: any) => {
  const owner = context.payload.repository.owner.login;
  const repo = context.payload.repository.name;
  const body = context.payload.issue.body || '';

  const templates = await context.octokit.repos
    .getContent({
      owner,
      repo,
      path: '.github/ISSUE_TEMPLATE',
    })
    .then(async (r: any) =>
      Promise.all(
        (r.data as Array<File>)
          .filter((f) => f.name.match(/.*\.ya?ml/))
          .map(async (f) => ({
            ...f,
            raw: await context.octokit
              .request(`GET ${f.download_url}`)
              .then((r: any) => r.data)
              .catch(() => ''),
          }))
      )
    )
    .catch(() => []);

  let parsed;
  for (const idx in templates) {
    try {
      if (!Object.prototype.hasOwnProperty.call(templates, idx)) {
        continue;
      }

      const template = parseYaml(templates[idx].raw) as Template;

      parsed = template.body
        // "markdown" type can be ignored
        .filter((item) => item.type !== 'markdown')
        // Collect each item from parser
        .reduce((acc, item, idx, src) => {
          const nextItem = (idx < src.length - 1 && src[idx + 1]) || undefined;
          return {
            ...acc,
            ...match(item, body, nextItem),
          };
        }, {});
    } catch (e: any) {
      // match() function throws exception in case there's no label for given field in the issue.
      // This means the issue was not created via this template and we should continue iterating through templates.
      context.log.debug('Failed to process template', e, {
        template: templates[idx].name,
      });
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
