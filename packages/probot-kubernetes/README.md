# Probot on Kubernetes

This extension enables you to interface Kubernetes from Probot with ease. It's a simple wrapper on top of `@kubernetes/client-node`.

This extension features:

- `useApi(<API>)`: Instantiate any Kubernetes Api from within current context, using credentials available either locally or passed down by a Service Account.
- `getNamespace()`: Fetch current active namespace available from current context.
- `APIS`: Re-export of `@kubernetes/client-node` for easy access to Kubernetes APIs.
- `useK8sTokenStore(probotInstance)`: Full lifecycle management extending your Probot instance to store access tokens in Kubernetes Secrets. Secret is created on `installation.created` event, deleted on `installation.deleted` event and continously updated on any event received. The secret is named `probot-<INSTALLATION_ID>` and stored in current active namespace.

Additionally this library offers CRUD methods (without "R"-read) for the secret management allowing more granular control:

- `createTokenSecret(context)`: Promise which creates the `probot-<INSTALLATION_ID>` secret.
- `deleteTokenSecret(context)`: Promise which deletes the `probot-<INSTALLATION_ID>` secret.
- `updateTokenSecret(context)`: Promise which updates the `probot-<INSTALLATION_ID>` secret.
