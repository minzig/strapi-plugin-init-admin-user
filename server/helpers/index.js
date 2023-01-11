module.exports = {
  async getSuperAdminRole() {
    await strapi.admin.services.role.createRolesIfNoneExist();
    let superAdminRole = await strapi.db.query("admin::role").findOne({
      select: [],
      where: { code: "strapi-super-admin" },
      orderBy: {},
      populate: {},
    });

    if (!superAdminRole) {
      superAdminRole = await strapi.db.query("admin::role").create({
        data: {
          name: "Super Admin",
          code: "strapi-super-admin",
          description:
            "Super Admins can access and manage all features and settings.",
        }
      });
    }

    return superAdminRole;
  },
  initAdminData(env) {
    return {
      username: env.INIT_ADMIN_USERNAME || 'admin',
      password: env.INIT_ADMIN_PASSWORD || 'admin',
      firstname: env.INIT_ADMIN_FIRSTNAME || 'Admin',
      lastname: env.INIT_ADMIN_LASTNAME || 'Admin',
      email: env.INIT_ADMIN_EMAIL || 'admin@init-strapi-admin.strapi.io',
      blocked: false,
      isActive: true,
    }
  }
}
