# Probot on Kubernetes

This extension enables you to interface Kubernetes from Probot with ease. It's a simple wrapper on top of `@kubernetes/client-node`.

## Installation

```bash
npm install --save @operate-first/probot-kubernetes
```

## Overview

- `useApi(<API>)`: Instantiate any Kubernetes Api from within current context, using credentials available either locally or passed down by a Service Account.
- `getNamespace()`: Fetch current active namespace available from current context.
- `APIS`: Re-export of `@kubernetes/client-node` for easy access to Kubernetes APIs.
- `useK8sTokenStore(probotInstance)`: Full lifecycle management extending your Probot instance to store access tokens in Kubernetes Secrets. Secret is created on `installation.created` event, deleted on `installation.deleted` event and continously updated on any event received. The secret is named `probot-<INSTALLATION_ID>` and stored in current active namespace.

Additionally this library offers CRUD methods for the secret management allowing more granular control:

- `createTokenSecret(context)`: Promise which creates the token secret.
- `getTokenSecretName(context)`: Returns secret name relevant to current context.
- `updateTokenSecret(context)`: Promise which updates the token secret.
- `deleteTokenSecret(context)`: Promise which deletes the token secret.

## Usage

### Using `useK8sTokenStore(probotInstance)` middleware

```js
const kubernetes = require('@operate-first/probot-kubernetes');

module.exports = app => {
    kubernetes.useK8sTokenStore(app);

    app.on('push', (context) => {
        const jobPayload = {
            apiVersion: 'batch/v1',
            kind: 'Job',
            metadata: {
                generateName: 'hello-world-'
            },
            spec: {
                template: {
                    spec: {
                        containers: [
                            {
                                name: 'default',
                                image: 'alpine:latest',
                                command: ['/bin/sh', '-c', 'echo "$ORG_NAME: ${GITHUB_TOKEN:0:2}..."'],
                                env: [
                                    {
                                        name: 'ORG_NAME',
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: kubernetes.getTokenSecretName(context),
                                                key: 'orgName'
                                            }
                                        }
                                    },
                                    {
                                        name: 'GITHUB_TOKEN',
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: kubernetes.getTokenSecretName(context),
                                                key: 'token'
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }

        await kubernetes.useApi(kubernetes.APIS.BatchV1Api).createNamespacedJob(kubernetes.getNamespace(), jobPayload);
    });
}
```

### Using individual methods

In case you want to wrap the lifecycle methods in any additional logic, it is possible to call each CRUD method individually.

```js
const kubernetes = require('@operate-first/probot-kubernetes');

module.exports = app => {
    app.on('installation.created', async (context) => {
        await kubernetes.createTokenSecret(context);
    });

    app.on('installation.deleted', async (context) => {
        await kubernetes.deleteTokenSecret(context);
    });

    app.onAny(async (context) => {
        await kubernetes.updateTokenSecret(context);
    });

    app.on('push', (context) => {
        const jobPayload = {
            // see above
            // ...
        }

        await kubernetes.useApi(kubernetes.APIS.BatchV1Api).createNamespacedJob(kubernetes.getNamespace(), jobPayload);
    });
};
```
