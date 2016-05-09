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
        if(server === null)
        {
            this.permissions[null] = {};
            this.permissions[null][permission] = true;
        }
        else
        {
            if(this.permissions[server.id] === undefined)
            {
                this.permissions[server.id] = {};
                if(this.permissions[null] !== undefined)
                {
                    //use the null server permissions object as template
                    for(key in this.permissions[null])
                    {
                        this.permissions[server.id][key] = this.permissions[null][key];
                    }
                }
            }

            this.permissions[server.id][permission] = true;
        }
    }

    remove(server, permission)
    {
        if(server === null)
        {
            this.permissions[null][permission] = false;
        }
        else
        {
            if(this.permissions[server.id] === undefined)
            {
                this.permissions[server.id] = {};
                if(this.permissions[null] !== undefined)
                {
                    //use the null server permissions object as template
                    for(key in this.permissions[null])
                    {
                        this.permissions[server.id][key] = this.permissions[null][key];
                    }
                }
            }

            this.permissions[server.id][permission] = false;
        }
    }

    is_allowed(server, permission)
    {
        if(server === null)
        {
            if(this.permissions[null] === undefined)
                return false;

            if(this.permissions[null][permission] === undefined)
                return false;

            return this.permissions[null][permission];
        }

        if(this.permissions[server.id] === undefined)
            return false;

        if(this.permission[server.id][permission] === undefined)
            return false;

        return this.permissions[server.id][permission];
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
        if(this.roles[role] === undefined)
            return false;

        this.roles[role].add(server, name);
        return true;
    }

    remove(name, role, server)
    {
        if(this.roles[role] === undefined)
            return false;

        this.roles[role].remove(server, name);
        return true;
    }

    is_allowed(name, role, server)
    {
        return this.roles[role].is_allowed(server, name);
    }
}

module.exports = new Permissions();
