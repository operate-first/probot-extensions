
<p align="center">
  <img src="static/robot.svg" width="200" alt="Probot's logo, a cartoon robot" />
</p>
<h2 align="center">Probot extensions</h2>
<p align="center">by Open Services Group</p>
<p  align="center" style='margin-bottom:4em'>
  <a href="https://github.com/open-services-group/probot-extensions/actions?query=workflow%3APush">
    <img src="https://img.shields.io/github/workflow/status/open-services-group/probot-extensions/Push" alt="Build Status">
  </a>
  <a href="https://github.com/open-services-group/probot-extensionse">
    <img alt="GitHub last commit" src="https://img.shields.io/github/last-commit/open-services-group/probot-extensions">
  </a>
  <a href="https://github.com/open-services-group/probot-extensions/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license">
  </a>
  <a href="https://github.com/open-services-group/probot-extensions/issues?q=is%3Aissue+is%3Aopen+label%3Akind%2Fbug">
    <img alt="Reported bugs" src="https://img.shields.io/github/issues-search/open-services-group/probot-extensions?color=red&label=reported%20bugs&query=is%3Aopen%20label%3Akind%2Fbug">
  </a>
  <a href="https://github.com/open-services-group/probot-extensions/issues?q=is%3Aissue+is%3Aopen+label%3Akind%2Fbug">
  <img alt="Feature requests" src="https://img.shields.io/github/issues-search/open-services-group/probot-extensions?label=feature%20requests&query=is%3Aopen%20label%3Akind%2Ffeature">
  </a>
</p>

<p align="center">This is a collection of extensions to <a href="https://probot.github.io/">Probot</a>. For details see individual packages</p>


| Package                                  | Documentation                                                                                                        | Tags                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@open-services-group/probot-kubernetes` | [![Documentation](https://img.shields.io/badge/docs-packages/probot--kubernetes-blue)](./packages/probot-kubernetes) | ![npm](https://img.shields.io/npm/dw/@open-services-group/probot-kubernetes) ![npm (scoped)](https://img.shields.io/npm/v/open-services-group/probot-kubernetes) |
| `@open-services-group/probot-metrics`    | [![Documentation](https://img.shields.io/badge/docs-packages/probot--metrics-blue)](./packages/probot-metrics)       | ![npm](https://img.shields.io/npm/dw/@open-services-group/probot-metrics) ![npm (scoped)](https://img.shields.io/npm/v/open-services-group/probot-metrics)       |


## Development

We use NPM workspaces to manage this monorepo.

### Build all packages

```bash
npm run build --workspaces
```

### Link packages for local development

1. Go to the local package folder (let's say `probot-metrics` package) and advertize this package to NPM as linkable:

    ```bash
    pushd packages/probot-metrics
    npm link
    popd
    ```

2. Go to your project folder (e.g. [peribolos-as-a-service](https://github.com/open-services-group/peribolos-as-a-service/) and tell NPM to link the package in here:

    ```bash
    pushd ../peribolos-as-a-service
    npm link @open-services-group/probot-metrics
    popd
    ```

To reverse this setup and restore using default packages from the registry use `npm unlink` as follows:

1. Go to your project folder (e.g. [peribolos-as-a-service](https://github.com/open-services-group/peribolos-as-a-service/) and tell NPM to unlink the package:

    ```bash
    pushd ../peribolos-as-a-service
    npm unlink --no-save @open-services-group/probot-metrics
    popd
    ```

2. Additionally you can also remove the package from a global list of linkable packages by running:

    ```bash
    pushd packages/probot-metrics
    npm unlink
    popd
    ```
