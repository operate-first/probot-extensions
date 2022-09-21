import fs from 'fs';
import * as k8s from '@kubernetes/client-node';
import { InstallationAccessTokenAuthentication } from '@octokit/auth-app';
import dotenv from 'dotenv';
import { Probot } from 'probot';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const EXPIRATION_THRESHOLD = 5 * 60000; // 5 minutes in milliseconds
const SECRET_NAME_PREFIX = 'probot-';

// K8s client for using k8s apis.
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sContext = kc.getCurrentContext();
const k8sNamespace = (() => {
  if (k8sContext === 'inClusterContext') {
    return fs.readFileSync(
      '/var/run/secrets/kubernetes.io/serviceaccount/namespace',
      'utf8'
    );
  } else {
    const ctx = kc.getContextObject(k8sContext);
    return ctx?.namespace || 'default';
  }
})();

type ApiConstructor<T extends k8s.ApiType> = new (server: string) => T;
export const useApi = <T extends k8s.ApiType>(
  apiClientType: ApiConstructor<T>
): T => kc.makeApiClient(apiClientType);
export const getNamespace = () => k8sNamespace;
export const APIS = k8s;

export const useK8sTokenStore = (app: Probot) => {
  app.on('installation.created', async (context) => {
    await createTokenSecret(context);
  });

  app.on('installation.deleted', async (context) => {
    await deleteTokenSecret(context);
  });

  app.onAny(async (context) => {
    await updateTokenSecret(context);
  });
};

export const getTokenSecretName = (context: any) => {
  return SECRET_NAME_PREFIX + context.payload.installation.id;
};

const unpackExceptionMessage = (err: any) => {
  throw err?.body?.message || err;
};

const createSecretPayload = async (context: any) => {
  const appAuth = (await context.octokit.auth({
    type: 'installation',
  })) as InstallationAccessTokenAuthentication;

  // orgName may not exist in payload
  const orgName =
    context.payload.installation?.account?.login ||
    context.payload.organization?.login;

  return {
    metadata: {
      name: getTokenSecretName(context),
      labels: {
        'app.kubernetes.io/created-by': 'probot',
      },
      annotations: {
        expiresAt: appAuth.expiresAt,
      },
    },
    stringData: {
      token: appAuth.token,
      orgName: orgName,
    },
  } as k8s.V1Secret;
};

export const createTokenSecret = async (context: any) => {
  return useApi(k8s.CoreV1Api)
    .createNamespacedSecret(getNamespace(), await createSecretPayload(context))
    .catch(unpackExceptionMessage);
};

export const deleteTokenSecret = async (context: any) => {
  return useApi(k8s.CoreV1Api)
    .deleteNamespacedSecret(
      SECRET_NAME_PREFIX + context.payload.installation.id,
      getNamespace()
    )
    .catch(unpackExceptionMessage);
};

export const updateTokenSecret = async (context: any) => {
  const appSecret = await useApi(k8s.CoreV1Api)
    .readNamespacedSecret(
      SECRET_NAME_PREFIX + context.payload.installation.id,
      k8sNamespace
    )
    .catch(unpackExceptionMessage);
  const current_date = new Date();
  const expiry_date = new Date(
    appSecret.body?.metadata?.annotations?.expiresAt || 0
  );

  // check if token not expired
  if (expiry_date.getTime() > current_date.getTime() + EXPIRATION_THRESHOLD) {
    return Promise.resolve();
  }

  return useApi(k8s.CoreV1Api)
    .patchNamespacedSecret(
      SECRET_NAME_PREFIX + context.payload.installation.id,
      getNamespace(),
      await createSecretPayload(context),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'content-type': 'application/merge-patch+json' } }
    )
    .catch(unpackExceptionMessage);
};
