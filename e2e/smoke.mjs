// End-to-end smoke test: installs the packed plugin into a fresh Strapi app,
// boots it and checks that the admin was created (and only once).
//
//   STRAPI_VERSION=latest node e2e/smoke.mjs     (run `npm run build` first)
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = process.env.STRAPI_VERSION || 'latest';
const port = 1400 + Math.floor(Math.random() * 500);
const work = mkdtempSync(join(tmpdir(), 'init-admin-e2e-'));
const app = join(work, 'app');

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

const login = async (email, password) => {
  const res = await fetch(`http://localhost:${port}/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.status;
};

const apiStatus = async (token) =>
  (
    await fetch(`http://localhost:${port}/api/users-permissions/roles`, {
      headers: { authorization: `Bearer ${token}` },
    })
  ).status;

const startStrapi = async (env) => {
  const logs = [];
  // the scaffold leaves DATABASE_FILENAME empty, which breaks sqlite
  mkdirSync(join(app, '.tmp'), { recursive: true });
  const child = spawn('npx', ['strapi', 'start'], {
    cwd: app,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      DATABASE_FILENAME: '.tmp/data.db',
      PORT: String(port),
      ...env,
    },
  });
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));

  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      if ((await fetch(`http://localhost:${port}/_health`)).status === 204) {
        return { child, logs: () => logs.join('') };
      }
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  child.kill();
  throw new Error(`Strapi did not start:\n${logs.join('')}`);
};

const stop = (child) =>
  new Promise((done) => {
    child.once('exit', done);
    child.kill('SIGTERM');
  });

const assert = (condition, message, details = '') => {
  if (!condition) throw new Error(`FAILED: ${message}\n${details}`);
  console.log(`ok - ${message}`);
};

try {
  console.log(`Scaffolding a Strapi app (target version: ${version}) in ${app}`);
  run(
    'npx',
    [
      '--yes',
      'create-strapi@latest',
      app,
      '--no-run',
      '--skip-cloud',
      '--js',
      '--use-npm',
      '--install',
      '--no-example',
      '--no-git-init',
      '--non-interactive',
      '--dbclient',
      'sqlite',
    ],
    work,
  );

  if (version !== 'latest') {
    // older create-strapi CLIs lack the non-interactive flags, so pin the packages instead
    const packages = ['@strapi/strapi', '@strapi/plugin-users-permissions', '@strapi/plugin-cloud'];
    run(
      'npm',
      [
        'install',
        '--save-exact',
        '--legacy-peer-deps',
        ...packages.map((name) => `${name}@${version}`),
      ],
      app,
    );
  }

  run('npm', ['pack', '--pack-destination', work], root);
  const tarball = execFileSync('ls', [work], { encoding: 'utf8' })
    .split('\n')
    .find((name) => name.endsWith('.tgz'));
  run('npm', ['install', join(work, tarball)], app);

  const creds = {
    INIT_ADMIN: 'true',
    INIT_ADMIN_EMAIL: 'e2e@example.com',
    INIT_ADMIN_PASSWORD: 'E2ePass1234',
    INIT_ADMINS: JSON.stringify([
      {
        email: 'editor@example.com',
        firstname: 'Ed',
        password: 'Editor1234',
        roles: ['strapi-editor'],
      },
    ]),
    INIT_API_TOKENS: JSON.stringify([
      { name: 'e2e', type: 'read-only', accessKey: 'e2e-fixed-token' },
    ]),
  };

  // 1. first boot creates the admin
  let strapi = await startStrapi(creds);
  assert(strapi.logs().includes('Created admin'), 'logs the admin creation');
  assert(!strapi.logs().includes(creds.INIT_ADMIN_PASSWORD), 'does not log the password');
  assert(
    (await login(creds.INIT_ADMIN_EMAIL, creds.INIT_ADMIN_PASSWORD)) === 200,
    'admin can log in',
  );
  assert(
    (await login('editor@example.com', 'Editor1234')) === 200,
    'extra admin (INIT_ADMINS) can log in',
  );
  assert(
    (await apiStatus('e2e-fixed-token')) === 200,
    'fixed API token (INIT_API_TOKENS) works',
    strapi
      .logs()
      .split('\n')
      .filter((line) => /token/i.test(line))
      .join('\n'),
  );
  assert((await apiStatus('wrong-token')) === 401, 'a wrong API token is rejected');
  await stop(strapi.child);

  // 2. second boot with other credentials changes nothing
  strapi = await startStrapi({ ...creds, INIT_ADMIN_EMAIL: 'other@example.com' });
  assert(!strapi.logs().includes('Created admin'), 'does not create a second admin');
  assert(
    (await login('other@example.com', creds.INIT_ADMIN_PASSWORD)) !== 200,
    'other admin does not exist',
  );
  await stop(strapi.child);

  // 3. without INIT_ADMIN (production) nothing runs
  rmSync(join(app, '.tmp'), { recursive: true, force: true });
  strapi = await startStrapi({ INIT_ADMIN: '' });
  assert(
    !strapi.logs().includes('Created admin'),
    'is disabled outside development without INIT_ADMIN',
  );
  await stop(strapi.child);

  console.log('E2E passed');
} finally {
  rmSync(work, { recursive: true, force: true });
}
