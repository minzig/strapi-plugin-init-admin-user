import { beforeEach, describe, expect, it, vi } from 'vitest';

import bootstrap from '../server/src/bootstrap';
import type { PluginConfig, Strapi } from '../server/src/lib/types';
import { createSeeder } from '../server/src/services/seeder';

const baseConfig = (overrides: Partial<PluginConfig> = {}): PluginConfig => ({
  mode: 'auto',
  admin: {
    username: 'admin',
    password: 'Secret123',
    firstname: 'Admin',
    lastname: 'Admin',
    email: 'Admin@Example.com',
  },
  admins: [],
  roles: [],
  apiTokens: [],
  ...overrides,
});

const makeStrapi = ({ users = 0, firstAdmin = true } = {}) => {
  const state = { users, roles: [] as { id: number; name: string; code: string }[] };
  const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const user = {
    create: vi.fn(async () => {
      state.users += 1;
    }),
    createFirstAdmin: vi.fn(async () => {
      state.users += 1;
    }),
  };
  const role = {
    createRolesIfNoneExist: vi.fn(async () => {}),
    getSuperAdmin: vi.fn(async () => ({ id: 1, name: 'Super Admin', code: 'strapi-super-admin' })),
    create: vi.fn(async (attrs) => {
      const created = { id: state.roles.length + 10, ...attrs };
      state.roles.push(created);
      return created;
    }),
  };

  const strapi = {
    log,
    config: { get: vi.fn() },
    admin: { services: { user: firstAdmin ? user : { create: user.create }, role } },
    db: {
      query: (uid: string) => ({
        count: async ({ where }: { where?: { email?: string } } = {}) =>
          uid === 'admin::user' ? (where?.email ? 0 : state.users) : 0,
        findOne: async ({ where }: { where: { $or: Record<string, string>[] } }) =>
          state.roles.find((r) => where.$or.some((c) => c.name === r.name || c.code === r.code)) ??
          (where.$or.some((c) => c.code === 'strapi-editor') ? { id: 2 } : null),
      }),
    },
  };

  return { strapi: strapi as unknown as Strapi, user, role, log, state };
};

describe('seeder', () => {
  let ctx: ReturnType<typeof makeStrapi>;
  beforeEach(() => {
    ctx = makeStrapi();
  });

  it('creates the first admin via createFirstAdmin with a normalized email', async () => {
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(baseConfig());

    expect(ctx.user.createFirstAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@example.com', password: 'Secret123' }),
    );
    expect(ctx.log.info).toHaveBeenCalledWith(expect.stringContaining('Created admin'));
  });

  it('makes sure the default roles exist before creating the first admin', async () => {
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(baseConfig());

    expect(ctx.role.createRolesIfNoneExist.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.user.createFirstAdmin.mock.invocationCallOrder[0]!,
    );
  });

  it('never logs the password', async () => {
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(baseConfig());

    const logged = JSON.stringify(ctx.log.info.mock.calls);
    expect(logged).not.toContain('Secret123');
    expect(logged).toContain('[hidden]');
  });

  it('falls back to user.create + the super admin role without createFirstAdmin', async () => {
    ctx = makeStrapi({ firstAdmin: false });
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(baseConfig());

    expect(ctx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ roles: [1], isActive: true, registrationToken: null }),
    );
  });

  it('does nothing when an admin already exists (idempotent)', async () => {
    ctx = makeStrapi({ users: 1 });
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(baseConfig());

    expect(ctx.user.createFirstAdmin).not.toHaveBeenCalled();
    expect(ctx.user.create).not.toHaveBeenCalled();
  });

  it('warns about default credentials outside development', async () => {
    const config = baseConfig();
    config.admin.password = 'admin';
    await createSeeder(ctx.strapi, { NODE_ENV: 'production' }).run(config);

    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('default admin credentials'));
    expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('password policy'));
  });

  it('creates roles first, then extra admins with resolved role ids', async () => {
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(
      baseConfig({
        roles: [{ name: 'QA', code: 'qa' }],
        admins: [{ email: 'Editor@Example.com', firstname: 'Ed', roles: ['strapi-editor', 'qa'] }],
      }),
    );

    expect(ctx.role.create).toHaveBeenCalledWith({ name: 'QA', code: 'qa' });
    expect(ctx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'editor@example.com', roles: [2, 10] }),
    );
  });
});

const run = async (mode: PluginConfig['mode'], env: Record<string, string>) => {
  const ctx = makeStrapi();
  (ctx.strapi.config.get as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig({ mode }));
  vi.stubEnv('NODE_ENV', env.NODE_ENV ?? 'production');
  await bootstrap({ strapi: ctx.strapi });
  vi.unstubAllEnvs();
  return ctx;
};

describe('seeder extra admins', () => {
  it('skips an admin when none of its roles exist', async () => {
    const ctx = makeStrapi({ users: 1 });
    await createSeeder(ctx.strapi, { NODE_ENV: 'development' }).run(
      baseConfig({ admins: [{ email: 'a@b.c', firstname: 'A', roles: ['nope'] }] }),
    );

    expect(ctx.user.create).not.toHaveBeenCalled();
    expect(ctx.log.error).toHaveBeenCalledWith(expect.stringContaining('none of its roles exist'));
  });
});

describe('bootstrap', () => {
  it('seeds in development when mode is auto', async () => {
    expect(
      (await run('auto', { NODE_ENV: 'development' })).user.createFirstAdmin,
    ).toHaveBeenCalled();
  });

  it('skips outside development when mode is auto', async () => {
    expect((await run('auto', {})).user.createFirstAdmin).not.toHaveBeenCalled();
  });

  it('seeds in production when mode is always', async () => {
    expect((await run('always', {})).user.createFirstAdmin).toHaveBeenCalled();
  });

  it('never seeds when mode is never', async () => {
    expect(
      (await run('never', { NODE_ENV: 'development' })).user.createFirstAdmin,
    ).not.toHaveBeenCalled();
  });
});
