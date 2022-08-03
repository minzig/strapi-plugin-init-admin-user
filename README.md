# strapi-plugin-init-admin-user

Creates a strapi admin user on startup. Simplifies working with multiple strapi environments.  

<img src="https://raw.githubusercontent.com/minzig/strapi-plugin-init-admin-user/main/public/strapi-plugin-init-admin-user-env.png" alt="Init Admin Example Variables" />

---

## Installation 
Add `strapi-plugin-init-admin-user` to your strapi (**v4!**).

```bash
# npm:
npm install strapi-plugin-init-admin-user
```

```bash
# yarn:
yarn add strapi-plugin-init-admin-user
```

Create these environment variables with your initial values.
```
INIT_ADMIN_USERNAME=admin
INIT_ADMIN_PASSWORD=admin
INIT_ADMIN_FIRSTNAME=Admin
INIT_ADMIN_LASTNAME=Admin
INIT_ADMIN_EMAIL=admin@init-strapi-admin.strapi.io
```

If you decide to also use this plugin **outside of `development`-mode** you also **need to add** the following environment variable.

```
INIT_ADMIN=true
```
---
## Usage
After installing the plugin and creating your environment variables start your strapi (locally: `npm run develop`) and watch out for the `info`-log:
> Created admin (E-Mail: admin@init-strapi-admin.strapi.io, Password: [INIT_ADMIN_PASSWORD]).

**Note:** By default the plugin will only create an **initial** admin-user if there is **no existing user** in your strapi application!

<img src="https://raw.githubusercontent.com/minzig/strapi-plugin-init-admin-user/main/public/strapi-plugin-init-admin-user-infolog.png" alt="Success Notification after Admin Creation on Startup" />  

<img src="https://raw.githubusercontent.com/minzig/strapi-plugin-init-admin-user/main/public/strapi-plugin-init-admin-user-result.png" alt="Init Admin Result in Strapi" />

---
## Support
Leave a '**Thank You**' with a ⭐️ on [Github](https://github.com/minzig/strapi-plugin-init-admin-user) and have a nice day!

---
## Links
[Plugin on Github](https://github.com/minzig/strapi-plugin-init-admin-user)   
[Plugin on NPM](https://www.npmjs.com/package/strapi-plugin-init-admin-user) 
[Plugin on Strapi Marketplace](https://market.strapi.io/plugins/strapi-plugin-init-admin-user)

---
## License
[MIT License](LICENSE.md) - Created by [minzig](https://github.com/minzig)🍃




