import { readFileSync } from 'node:fs';

import type { AdminCredentials, ApiTokenInput, ExtraAdmin, RoleInput } from './types';

export type Env = Record<string, string | undefined>;

export const DEFAULT_ADMIN: AdminCredentials = {
  username: 'admin',
  password: 'admin',
  firstname: 'Admin',
  lastname: 'Admin',
  email: 'admin@init-strapi-admin.strapi.io',
};

/**
 * Reads `NAME`, or the contents of the file named by `NAME_FILE`
 * (Docker / Kubernetes secrets). A plain `NAME` wins over `NAME_FILE`.
 */
export const readEnv = (env: Env, name: string): string | undefined => {
  const direct = env[name];
  if (direct) return direct;

  const file = env[`${name}_FILE`];
  if (!file) return undefined;

  try {
    return readFileSync(file, 'utf8').replace(/\r?\n$/, '');
  } catch (error) {
    throw new Error(`Couldn't read ${name}_FILE (${file}): ${(error as Error).message}`, {
      cause: error,
    });
  }
};

/** `INIT_ADMIN` is either `"true"` or a JSON object string. */
export const isJsonString = (value: unknown): value is string =>
  typeof value === 'string' && value.trimStart().startsWith('{');

export const parseJson = <T>(name: string, value: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Couldn't parse ${name} as JSON: ${(error as Error).message}`, {
      cause: error,
    });
  }
};

const parseJsonArray = <T>(env: Env, name: string): T[] => {
  const raw = readEnv(env, name);
  if (!raw) return [];

  const parsed = parseJson<unknown>(name, raw);
  if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array.`);
  return parsed as T[];
};

/** Credentials from the `INIT_ADMIN_*` variables, overlaid by the `INIT_ADMIN` JSON string. */
export const adminFromEnv = (env: Env): AdminCredentials => {
  const json = isJsonString(env.INIT_ADMIN)
    ? parseJson<Partial<AdminCredentials>>('INIT_ADMIN', env.INIT_ADMIN)
    : {};

  return {
    username: readEnv(env, 'INIT_ADMIN_USERNAME') || DEFAULT_ADMIN.username,
    password: readEnv(env, 'INIT_ADMIN_PASSWORD') || DEFAULT_ADMIN.password,
    firstname: readEnv(env, 'INIT_ADMIN_FIRSTNAME') || DEFAULT_ADMIN.firstname,
    lastname: readEnv(env, 'INIT_ADMIN_LASTNAME') || DEFAULT_ADMIN.lastname,
    email: readEnv(env, 'INIT_ADMIN_EMAIL') || DEFAULT_ADMIN.email,
    ...json,
  };
};

export const adminsFromEnv = (env: Env): ExtraAdmin[] =>
  parseJsonArray<ExtraAdmin>(env, 'INIT_ADMINS');
export const rolesFromEnv = (env: Env): RoleInput[] => parseJsonArray<RoleInput>(env, 'INIT_ROLES');
export const apiTokensFromEnv = (env: Env): ApiTokenInput[] =>
  parseJsonArray<ApiTokenInput>(env, 'INIT_API_TOKENS');

/** Whether the plugin should seed on this boot when `mode` is `auto`. */
export const shouldRunAuto = (env: Env): boolean =>
  env.NODE_ENV === 'development' || env.INIT_ADMIN === 'true' || isJsonString(env.INIT_ADMIN);
