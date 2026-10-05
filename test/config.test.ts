import { describe, expect, it } from 'vitest';

import config from '../server/src/config';
import { passwordPolicyViolations } from '../server/src/lib/password';
import { redact } from '../server/src/lib/redact';

const valid = () => ({ ...config.default(), mode: 'auto' });

describe('config validator', () => {
  it('accepts the defaults', () => {
    expect(() => config.validator(valid())).not.toThrow();
  });

  it('rejects an unknown mode', () => {
    expect(() => config.validator({ ...valid(), mode: 'sometimes' })).toThrow(/mode/);
  });

  it('requires email and firstname on extra admins', () => {
    expect(() =>
      config.validator({ ...valid(), admins: [{ email: 'a@b.c', roles: ['x'] }] }),
    ).toThrow(/admins\[0\]\.firstname/);
  });

  it('requires at least one role on extra admins', () => {
    expect(() =>
      config.validator({ ...valid(), admins: [{ email: 'a@b.c', firstname: 'A' }] }),
    ).toThrow(/admins\[0\]\.roles/);
  });

  it('only allows read-only or full-access API tokens', () => {
    expect(() =>
      config.validator({ ...valid(), apiTokens: [{ name: 'ci', type: 'custom' }] }),
    ).toThrow(/apiTokens\[0\]\.type/);
  });
});

describe('passwordPolicyViolations', () => {
  it('flags the default password', () => {
    expect(passwordPolicyViolations('admin')).toEqual([
      'at least 8 characters',
      'an uppercase letter',
      'a number',
    ]);
  });

  it('accepts a compliant password', () => {
    expect(passwordPolicyViolations('Gourmet1234')).toEqual([]);
  });
});

describe('redact', () => {
  it('masks secrets only', () => {
    expect(redact({ email: 'a@b.c', password: 'x', accessKey: 'y' })).toEqual({
      email: 'a@b.c',
      password: '[hidden]',
      accessKey: '[hidden]',
    });
  });
});
