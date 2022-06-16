import fs from 'fs';
import path from 'path';
import * as parser from './parser';

const loadFixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, `fixtures/${name}`), 'utf-8');

describe('match', () => {
  it('single item by label', () => {
    const result = parser.match(
      { type: 'textarea', attributes: { label: 'Heading' } },
      loadFixture('single_item.md'),
      undefined
    );

    expect(result).toEqual(['', { heading: 'text' }]);
  });

  it('single item by key', () => {
    const result = parser.match(
      { id: 'heading', type: 'textarea', attributes: { label: 'Heading' } },
      loadFixture('single_item.md'),
      undefined
    );
    expect(result).toEqual(['', { heading: 'text' }]);
  });

  it('multiple items by key', () => {
    const result = parser.match(
      { id: 'heading', type: 'textarea', attributes: { label: 'Heading' } },
      loadFixture('multiple_items.md'),
      { id: 'next', type: 'textarea', attributes: { label: 'Next' } }
    );

    expect(result).toEqual(['### Next\n\nnext text', { heading: 'text' }]);
  });

  it('multiple items by key', () => {
    const result = parser.match(
      { type: 'textarea', attributes: { label: 'Heading' } },
      loadFixture('multiple_items.md'),
      { type: 'textarea', attributes: { label: 'Next' } }
    );

    expect(result).toEqual(['### Next\n\nnext text', { heading: 'text' }]);
  });

  it.each([
    {
      type: <const>'input',
      expectedMatch: 'text',
    },
    {
      type: <const>'input',
      fixtureSuffix: 'none',
      expectedMatch: '',
    },
    {
      type: <const>'input',
      fixtureSuffix: 'multi_line',
      expectedMatch: '',
      exception: true,
    },
    {
      type: <const>'textarea',
      expectedMatch: 'text',
    },
    {
      type: <const>'textarea',
      fixtureSuffix: 'multiline',
      expectedMatch: 'line0\nline1\nline2',
    },
    {
      type: <const>'textarea',
      fixtureSuffix: 'render',
      expectedMatch: 'text',
      attributes: { render: true },
    },
    {
      type: <const>'textarea',
      fixtureSuffix: 'none',
      expectedMatch: '',
    },
    {
      type: <const>'textarea',
      fixtureSuffix: 'fakeheading',
      expectedMatch: 'line0\n\n### Fake heading\n\nline1',
    },
    {
      type: <const>'checkboxes',
      expectedMatch: ['item1'],
    },
    {
      type: <const>'checkboxes',
      fixtureSuffix: 'none',
      expectedMatch: [],
    },
    {
      type: <const>'checkboxes',
      fixtureSuffix: 'multiple',
      expectedMatch: ['item1', 'item2'],
    },
    {
      type: <const>'dropdown',
      expectedMatch: ['item1'],
      attributes: {
        options: ['item0', 'item1', 'item2'],
      },
    },
    {
      type: <const>'dropdown',
      fixtureSuffix: 'none',
      expectedMatch: [],
      attributes: {
        options: ['item0', 'item1', 'item2'],
      },
    },
    {
      type: <const>'dropdown',
      fixtureSuffix: 'multiple',
      expectedMatch: ['item1', 'item2'],
      attributes: {
        options: ['item0', 'item1', 'item2'],
      },
    },
    {
      type: <const>'dropdown',
      fixtureSuffix: 'with_coma',
      expectedMatch: ['it, em1', 'it, em2'],
      attributes: {
        options: ['it, em0', 'it, em1', 'it, em2'],
      },
    },
  ])(
    'type: $type, variant: $fixtureSuffix',
    ({ type, fixtureSuffix, expectedMatch, attributes = {}, exception }) => {
      const result = () =>
        parser.match(
          {
            type: type,
            attributes: {
              label: type[0].toUpperCase() + type.slice(1),
              ...attributes,
            },
          } as Extract<parser.Body, { type: typeof type }>,
          loadFixture(
            type + (fixtureSuffix ? '_' + fixtureSuffix : '') + '.md'
          ),
          undefined
        );

      if (exception) {
        expect(result).toThrow();
      } else {
        expect(result()).toEqual(['', { [type]: expectedMatch }]);
      }
    }
  );
});

const getFile = (name: string, withContent?: boolean) => ({
  path: 'path',
  sha: 'sha',
  size: 1,
  url: 'https://url/' + name,
  html_url: 'https://html_url/' + name,
  git_url: 'https://git_url/' + name,
  download_url: 'https://download_url/' + name,
  type: 'file',
  raw: withContent ? 'text' : undefined,
  name,
});

describe('fetchTemplates', () => {
  it.each([
    {
      description: 'single yaml file',
      files: [{ name: 'template.yaml', raw: 'text', result: true }],
    },
    {
      description: 'multiple yaml files',
      files: [
        { name: 'template.yaml', result: true },
        { name: 'template2.yaml', result: true },
        { name: 'template3.yml', result: true },
      ],
    },
    {
      description: 'no files',
      files: [],
    },
    {
      description: 'single markdown file',
      files: [{ name: 'template.md', result: false }],
    },
    {
      description: 'multiple markdown files',
      files: [
        { name: 'template.md', result: false },
        { name: 'template2.md', result: false },
      ],
    },
  ])('$description', async ({ files }) => {
    const context = {
      payload: {
        repository: {
          owner: {
            login: 'user',
          },
          name: 'repo',
        },
      },
      octokit: {
        request: jest.fn(async () => ({ data: 'text' })),
        repos: {
          getContent: jest.fn(async () => ({
            data: files.map((f) => getFile(f.name)),
          })),
        },
      },
    };

    const result = await parser.fetchTemplates(context);

    expect(result).toEqual(
      files.filter((f) => f.result).map((f) => getFile(f.name, true))
    );
    expect(context.octokit.request.mock.calls).toEqual(
      files
        .filter((f) => f.result)
        .map((f) => ['GET ' + getFile(f.name).download_url])
    );
  });
});

describe('parse', () => {
  const templates = ['template_single_input', 'template_multiple_inputs'];

  beforeEach(() => {
    const spy = jest.spyOn(parser, 'fetchTemplates');
    spy.mockImplementation(async () =>
      templates.map((t) => ({ ...getFile(t), raw: loadFixture(t + '.yaml') }))
    );
  });

  it('single input', async () => {
    const context = {
      payload: { issue: { body: '### This is input field\n\nvalue' } },
      log: console,
    };

    const data = await parser.parse(context);

    expect(data).toEqual({ thisIsInput: 'value' });
  });

  it('no match', async () => {
    const context = {
      payload: { issue: { body: '### Something else\n\nvalue' } },
      log: { debug: jest.fn() },
    };

    const data = await parser.parse(context);

    expect(data).toEqual({});
  });

  it('multiple inputs', async () => {
    const context = {
      payload: {
        issue: {
          body: '### This is input field\n\nvalue\n\n### This is input field\n\nvalue2',
        },
      },
      log: { debug: jest.fn() },
    };

    const data = await parser.parse(context);

    expect(data).toEqual({ thisIsInput: 'value', thisIsInput2: 'value2' });
  });
});
