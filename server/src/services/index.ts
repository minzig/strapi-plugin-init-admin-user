import type { Strapi } from '../lib/types';
import { createSeeder } from './seeder';

export default {
  seeder: ({ strapi }: { strapi: Strapi }) => createSeeder(strapi),
};
