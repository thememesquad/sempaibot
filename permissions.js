"use strict";

class Role
{
    constructor(name, options)
    {
        options = options || {};

        this.name = name;
        this.global = (options.global === undefined) ? false : options.global;
        this.default = (options.default === undefined) ? false : options.default;
        this.permissions = {};
    }

    add(server, permission)
    {
    }
}

class Permissions
{
    constructor()
    {
        this.roles = {};
        this.roles["superadmin"] = new Role("superadmin", {global: true});
        this.roles["admin"] = new Role("admin");
        this.roles["moderator"] = new Role("moderator");
        this.roles["normal"] = new Role("normal", {default: true});
    }

    register(name, defaultRole)
    {
        defaultRole = defaultRole || "normal";

        this.roles["superadmin"].add(null, name);
        if(defaultRole === "superadmin")
            return;

        this.roles["admin"].add(null, name);
        if(defaultRole === "admin")
            return;

        this.roles["moderator"].add(null, name);
        if(defaultRole === "moderator")
            return;

        this.roles["normal"].add(null, name);
    }

    add(name, role, server)
    {
    }

    remove(name, role, server)
    {
    }

    is_allowed(name, role, server)
    {
        //TODO: Actually check if its allowed
        return true;
    }
}

module.exports = new Permissions();
