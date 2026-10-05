import { adminFromEnv, adminsFromEnv, apiTokensFromEnv, rolesFromEnv } from '../lib/env';
import type { Mode, PluginConfig } from '../lib/types';

const MODES: Mode[] = ['auto', 'always', 'never'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertArray = (config: Record<string, unknown>, key: string) => {
  if (!Array.isArray(config[key])) throw new Error(`"${key}" must be an array`);
};

const assertEntries = (list: unknown[], key: string, required: string[]) => {
  list.forEach((entry, index) => {
    if (!isObject(entry)) throw new Error(`"${key}[${index}]" must be an object`);
    for (const field of required) {
      if (typeof entry[field] !== 'string' || !entry[field]) {
        throw new Error(`"${key}[${index}].${field}" is required`);
      }
    }
  });
};

export default {
  default: (): PluginConfig => ({
    mode: 'auto',
    admin: adminFromEnv(process.env),
    admins: adminsFromEnv(process.env),
    roles: rolesFromEnv(process.env),
    apiTokens: apiTokensFromEnv(process.env),
  }),
  validator(config: Record<string, unknown>) {
    if (!MODES.includes(config.mode as Mode)) {
      throw new Error(`"mode" must be one of: ${MODES.join(', ')}`);
    }
    if (!isObject(config.admin)) throw new Error('"admin" must be an object');

    for (const key of ['admins', 'roles', 'apiTokens']) assertArray(config, key);

    assertEntries(config.admins as unknown[], 'admins', ['email', 'firstname']);
    for (const [index, extra] of (config.admins as { roles?: unknown }[]).entries()) {
      if (!Array.isArray(extra.roles) || extra.roles.length === 0) {
        throw new Error(`"admins[${index}].roles" needs at least one role code or name`);
      }
    }
    assertEntries(config.roles as unknown[], 'roles', ['name']);
    assertEntries(config.apiTokens as unknown[], 'apiTokens', ['name', 'type']);

    for (const [index, token] of (config.apiTokens as { type: string }[]).entries()) {
      if (token.type !== 'read-only' && token.type !== 'full-access') {
        throw new Error(`"apiTokens[${index}].type" must be "read-only" or "full-access"`);
      }
    }
  },
};
