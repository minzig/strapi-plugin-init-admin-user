import type { Core } from '@strapi/strapi';

export const PLUGIN_ID = 'strapi-plugin-init-admin-user';

export type Strapi = Core.Strapi;

export type Mode = 'auto' | 'always' | 'never';

/** Credentials for the first (super) admin. Unknown keys are passed through to the user. */
export interface AdminCredentials {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  [key: string]: unknown;
}

/** An additional admin, created if no admin with this email exists yet. */
export interface ExtraAdmin {
  email: string;
  firstname: string;
  lastname?: string;
  username?: string;
  password?: string;
  /** Role codes (e.g. `strapi-editor`) or names. */
  roles?: string[];
  [key: string]: unknown;
}

export interface RoleInput {
  name: string;
  code?: string;
  description?: string;
}

export interface ApiTokenInput {
  name: string;
  description?: string;
  type: 'read-only' | 'full-access';
  /** Lifespan in milliseconds, `null` for unlimited. */
  lifespan?: number | null;
  /** Fixed access key (for CI). Needs Strapi internals, see README. */
  accessKey?: string;
}

export interface PluginConfig {
  mode: Mode;
  admin: AdminCredentials;
  admins: ExtraAdmin[];
  roles: RoleInput[];
  apiTokens: ApiTokenInput[];
}

export interface AdminRole {
  id: number | string;
  name: string;
  code: string;
}

/** The slice of Strapi's admin services this plugin relies on (v5). */
export interface AdminServices {
  user: {
    create(attributes: Record<string, unknown>): Promise<unknown>;
    createFirstAdmin?(attributes: Record<string, unknown>): Promise<unknown>;
  };
  role: {
    createRolesIfNoneExist(): Promise<void>;
    getSuperAdmin(): Promise<AdminRole | undefined | null>;
    create(attributes: Partial<AdminRole> & { description?: string }): Promise<AdminRole>;
  };
}
