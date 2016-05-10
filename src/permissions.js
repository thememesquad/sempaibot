"use strict";

class Role
{
    constructor(name, options)
    {
        options = options || {};

        this.name = name;
        this.global = (options.global === undefined) ? false : options.global;
        this.default = (options.default === undefined) ? false : options.default;
        this.permissions = {
            "null": {}
        };
    }

    add(server, permission)
    {
        if(server === null)
        {
            this.permissions["null"][permission] = true;
            
            for(var key in this.permissions)
            {
                if(this.permissions[key][permission] === undefined)
                    this.permissions[key][permission] = true;
            }
        }
        else
        {
            if(this.permissions[server.id] === undefined)
            {
                this.permissions[server.id] = {};
                if(this.permissions["null"] !== undefined)
                {
                    //use the null server permissions object as template
                    for(var key in this.permissions["null"])
                    {
                        this.permissions[server.id][key] = this.permissions["null"][key];
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
            this.permissions["null"][permission] = false;
        }
        else
        {
            if(this.permissions[server.id] === undefined)
            {
                this.permissions[server.id] = {};
                if(this.permissions["null"] !== undefined)
                {
                    //use the null server permissions object as template
                    for(var key in this.permissions["null"])
                    {
                        this.permissions[server.id][key] = this.permissions["null"][key];
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
            if(this.permissions["null"] === undefined)
                return false;

            if(this.permissions["null"][permission] === undefined)
                return false;

            return this.permissions["null"][permission];
        }

        if(this.permissions[server.id] === undefined)
        {
            this.permissions[server.id] = {};
            
            //use the null server permissions object as template
            for(var key in this.permissions["null"])
            {
                this.permissions[server.id][key] = this.permissions["null"][key];
            }
        }

        if(this.permissions[server.id][permission] === undefined)
        {
            this.permissions[server.id][permission] = this.permissions["null"][permission];
            
            if(this.permissions[server.id][permission] === undefined)
                return false;
        }
        
        return this.permissions[server.id][permission];
    }
    
    get_permissions(server)
    {
        if(this.permissions[server.id] === undefined)
        {
            this.permissions[server.id] = {};
            if(this.permissions["null"] !== undefined)
            {
                //use the null server permissions object as template
                for(var key in this.permissions["null"])
                {
                    this.permissions[server.id][key] = this.permissions["null"][key];
                }
            }
        }
        
        return this.permissions[server.id];
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
        
        this.permissions = [];
    }

    register(name, defaultRole)
    {
        //Can't register a permission twice
        if(this.permissions.indexOf(name) !== -1)
        {
            console.log("Permission '" + name + "' already registered.");
            return;
        }
           
        this.permissions.push(name);
        
        defaultRole = defaultRole || "normal";

        this.roles["superadmin"].add(null, name);
        if(defaultRole === "superadmin")
        {
            this.roles["admin"].remove(null, name);
            this.roles["moderator"].remove(null, name);
            this.roles["normal"].remove(null, name);
            return;
        }
        
        this.roles["admin"].add(null, name);
        if(defaultRole === "admin")
        {
            this.roles["moderator"].remove(null, name);
            this.roles["normal"].remove(null, name);
            return;
        }

        this.roles["moderator"].add(null, name);
        if(defaultRole === "moderator")
        {
            this.roles["normal"].remove(null, name);
            return;
        }

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
    
    get_role(name)
    {
        return this.roles[name];
    }
}

module.exports = new Permissions();
