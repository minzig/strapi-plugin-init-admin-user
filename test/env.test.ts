import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  adminFromEnv,
  adminsFromEnv,
  DEFAULT_ADMIN,
  isJsonString,
  readEnv,
  shouldRunAuto,
} from '../server/src/lib/env';

describe('adminFromEnv', () => {
  it('falls back to the defaults', () => {
    expect(adminFromEnv({})).toEqual(DEFAULT_ADMIN);
  });

  it('reads the INIT_ADMIN_* variables', () => {
    const admin = adminFromEnv({
      INIT_ADMIN_EMAIL: 'me@example.com',
      INIT_ADMIN_PASSWORD: 'Secret123',
      INIT_ADMIN_FIRSTNAME: 'Me',
    });
    expect(admin).toMatchObject({
      email: 'me@example.com',
      password: 'Secret123',
      firstname: 'Me',
      lastname: 'Admin',
    });
  });

  it('lets the INIT_ADMIN JSON string override the variables and pass extra keys through', () => {
    const admin = adminFromEnv({
      INIT_ADMIN_EMAIL: 'env@example.com',
      INIT_ADMIN: '{"email":"json@example.com","preferedLanguage":"de"}',
    });
    expect(admin.email).toBe('json@example.com');
    expect(admin.preferedLanguage).toBe('de');
  });

  it('throws a helpful error for invalid JSON', () => {
    expect(() => adminFromEnv({ INIT_ADMIN: '{nope' })).toThrow(/INIT_ADMIN as JSON/);
  });
});

describe('readEnv', () => {
  it('reads secrets from *_FILE and trims the trailing newline', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'init-admin-')), 'password');
    writeFileSync(file, 'FromFile123\n');
    expect(readEnv({ INIT_ADMIN_PASSWORD_FILE: file }, 'INIT_ADMIN_PASSWORD')).toBe('FromFile123');
  });

  it('prefers the plain variable over *_FILE', () => {
    expect(readEnv({ A: 'plain', A_FILE: '/nope' }, 'A')).toBe('plain');
  });

  it('names the variable when the file is unreadable', () => {
    expect(() => readEnv({ A_FILE: '/definitely/missing' }, 'A')).toThrow(/A_FILE/);
  });
});

describe('adminsFromEnv', () => {
  it('parses a JSON array', () => {
    expect(adminsFromEnv({ INIT_ADMINS: '[{"email":"a@b.c","firstname":"A"}]' })).toHaveLength(1);
  });

  it('rejects non-arrays', () => {
    expect(() => adminsFromEnv({ INIT_ADMINS: '{"a":1}' })).toThrow(/JSON array/);
  });
});

describe('shouldRunAuto', () => {
  it.each([
    [{ NODE_ENV: 'development' }, true],
    [{ INIT_ADMIN: 'true' }, true],
    [{ INIT_ADMIN: '{"email":"a@b.c"}' }, true],
    [{ NODE_ENV: 'production' }, false],
    [{ INIT_ADMIN: 'false' }, false],
    [{}, false],
  ])('%j -> %s', (env, expected) => {
    expect(shouldRunAuto(env)).toBe(expected);
  });
});

describe('isJsonString', () => {
  it('only accepts object-looking strings', () => {
    expect(isJsonString('{"a":1}')).toBe(true);
    expect(isJsonString('true')).toBe(false);
    expect(isJsonString(undefined)).toBe(false);
  });
});
