# Probot issue form parser

This extension provides a ready to use parser for issues created via [issue forms](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms).

## Installation

```bash
npm install --save @open-services-group/probot-issue-form
```

## Overview

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
