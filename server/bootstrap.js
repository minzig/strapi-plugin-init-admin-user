'use strict';

const { initAdminData, getSuperAdminRole } = require('./helpers')
module.exports = async ({ strapi }) => {
  // On strapi startup
  if (
    process.env.NODE_ENV === "development" ||
    process.env.INIT_ADMIN === "true" ||
    (typeof process.env.INIT_ADMIN === "string" && process.env.INIT_ADMIN.includes('{"'))
  ) {
    const users = await strapi.db.query("admin::user").findMany();
    if (users.length === 0) {
      const defaultAdmin = initAdminData(process.env);
      const superAdminRole = await getSuperAdminRole();
      defaultAdmin.roles = [superAdminRole.id];
      defaultAdmin.password = await strapi.service("admin::auth").hashPassword(defaultAdmin.password);
      try {
        await strapi.db.query("admin::user").create({ data: { ...defaultAdmin } });
        strapi.log.info(`Created admin (E-Mail: ${defaultAdmin.email}, Password: ${process.env.INIT_ADMIN_PASSWORD ? "[INIT_ADMIN_PASSWORD]" : "admin"}).`);
      } catch (e) {
        strapi.log.error(`Couldn't create admin (${defaultAdmin.email}):`, e);
      }
    }
  }
};
