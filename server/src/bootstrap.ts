import { shouldRunAuto } from './lib/env';
import { PLUGIN_ID, type PluginConfig, type Strapi } from './lib/types';
import { createSeeder } from './services/seeder';

export default async ({ strapi }: { strapi: Strapi }) => {
  const config = strapi.config.get(`plugin::${PLUGIN_ID}`) as PluginConfig;

  const enabled =
    config.mode === 'always' || (config.mode === 'auto' && shouldRunAuto(process.env));
  if (!enabled) return;

  await createSeeder(strapi).run(config);
};
