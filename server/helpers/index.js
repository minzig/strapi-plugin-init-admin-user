module.exports = {
  async getSuperAdminRole() {
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
    // only parse STRAPI_INIT_ADMIN variable if it has 5 colon-separated parts
    var config = [];
    if (env.STRAPI_INIT_ADMIN && env.STRAPI_INIT_ADMIN.match(/.*:.*:.*:.*:.*/)) {
      config = env.STRAPI_INIT_ADMIN.split(':');
    }
    // first priority: STRAPI_INIT_ADMIN, second priority: INIT_ADMIN_*, then fallback
    return {
      username: config[0] || (env.INIT_ADMIN_USERNAME || ''),
      password: config[1] || (env.INIT_ADMIN_PASSWORD || 'admin'),
      firstname: config[2] || (env.INIT_ADMIN_FIRSTNAME || 'Admin'),
      lastname: config[3] || (env.INIT_ADMIN_LASTNAME || ''),
      email: config[4] || (env.INIT_ADMIN_EMAIL || 'admin@init-strapi-admin.strapi.io'),
      blocked: false,
      isActive: true,
    }
  }
}
