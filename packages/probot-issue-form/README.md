# Probot issue form parser

This extension provides a ready to use parser for issues created via [issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms).

## Installation

```bash
npm install --save @open-services-group/probot-issue-form
```

## Overview

Library exposes a single fuction `parse`. It accepts probot context for `issue.created` or `issue.modified` events and returns a promise which resolves to a record mapping.

## Usage

```js
const issueForm = require('@open-services-group/probot-issue-form');

module.exports = app => {
    app.on('issues.created', async(context) => {
        try {
            const data = await issueForm.parse(context);
        } catch {
            app.log.info('Issue was not created using Issue form template (the YAML ones)')
        }
    });
}
```

## Supported fields

See [upstream documentation](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms) for API specification, [schema](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema#markdown) and details.

### Input

Textual response field which allows a single line response only.

#### Example with ID

Issue template:

```yaml
...
body:
  - type: input
    id: thisIsInput
    attributes:
      label: This is input field
```

Issue body:

```md
### This is input field

some value
```

Result:

```js
{thisIsInput: "some value"}
```

#### Example without ID

Issue template:

```yaml
...
body:
  - type: input
    attributes:
      label: This is input field
```

Issue body:

```md
### This is input field

some value
```

Result:

```js
{this-is-input-field: "some value"}
```

> This translation of labels to IDs is available for all the other input field types as well.

#### No response example

Issue template:

```yaml
...
body:
  - type: input
    attributes:
      label: This is input field
```

Issue body:

```md
### This is input field

_No response_
```

Result:

```js
{this-is-input-field: ""}
```

### Checkboxes

Checkboxes are parsed into an array of selected options.

#### Example

Issue template:

```yaml
...
body:
  - type: checkboxes
    id: thisIsCheckbox
    attributes:
      label: Use these checkboxes
      options:
        - label: First item
        - label: Second item
        - label: Third item
```

Issue body:

```md
### Use these checkboxes

- [ ] First item
- [X] Second item
- [X] Third item
```

Result:

```js
{thisIsCheckbox: ["Second item", "Third item"]}
```

#### No response example

Issue template:

```yaml
...
body:
  - type: checkboxes
    id: thisIsCheckbox
    attributes:
      label: Use these checkboxes
      options:
        - label: First item
        - label: Second item
        - label: Third item
```

Issue body:

```md
### Use these checkboxes

- [ ] First item
- [ ] Second item
- [ ] Third item
```

Result:

```js
{thisIsCheckbox: []}
```

### Dropdown

Since dropdowns allows user to select multiple options (when flag `mutliple` is truthy), they are parsed into array of selected options, similarly to checkboxes.

#### Example

Issue template:

```yaml
...
body:
  - type: dropdown
    id: thisIsDropdown
    attributes:
      label: Use this dropdown
      options:
        - First item
        - Second item
        - Third item
```

Issue body:

```md
### Use this dropdown

First item
```

Result:

```js
{thisIsDropdown: ["First item"]}
```

#### Example with multiple options allowed

Issue template:

```yaml
...
body:
  - type: dropdown
    id: thisIsDropdown
    attributes:
      label: Use this dropdown
      multiple: true
      options:
        - First item
        - Second item
        - Third item
```

Issue body:

```md
### Use this dropdown

First item, Second item
```

Result:

```js
{thisIsDropdown: ["First item", "Second item"]}
```

#### No response example

Issue template:

```yaml
...
body:
  - type: dropdown
    id: thisIsDropdown
    attributes:
      label: Use this dropdown
      options:
        - First item
        - Second item
        - Third item
```

Issue body:

```md
### Use this dropdown

_No response_
```

Result:

```js
{thisIsDropdown: []}
```

### Textarea

Type supports multiline text responses which can contain markdown formatting. There's also an optional flag `render`, which wraps the response into a codeblock (` ``` `), this extension removes this wrapping and returns the content only.


#### Example

Issue template:

```yaml
...
body:
  - type: textarea
    id: thisIsTextarea
    attributes:
      label: Use this textarea
```

Issue body:

```md
### Use this textarea

value
can
be
multiline
```

Result:

```js
{thisIsTextarea: "value
can
be
multiline"}
```

#### Example with render

Issue template:

```yaml
...
body:
  - type: textarea
    id: thisIsTextarea
    attributes:
      label: Use this textarea
      render: true
```

Issue body:

````md
### Use this textarea

```true
text
```
````

Result:

```js
{thisIsTextarea: "text"}
```

#### No response example

Issue template:

```yaml
...
body:
  - type: textarea
    id: thisIsTextarea
    attributes:
      label: Use this textarea
```

Issue body:

```md
### Use this textarea

_No response_
```

Result:

```js
{thisIsTextarea: ""}
```

### Markdown

Markdown field is not propagated to issue body, hence we ignore it.
