"use strict";
const Document = require("camo").Document;

class DBRole extends Document
{
    constructor()
    {
        super();
        
        this.name = String;
        this.permissions = Object;
    }
}

class Role
{
    constructor(name, options)
    {
        options = options || {};

        this.dbrole = null;
        this.name = name;
        this.global = (options.global === undefined) ? false : options.global;
        this.default = (options.default === undefined) ? false : options.default;
        this.permissions = {
            "null": {}
        };
    }

    setup(id)
    {
        if(this.permissions[id] === undefined)
        {
            this.permissions[id] = {};
            
            //use the null server permissions object as template
            for(let key in this.permissions["null"])
            {
                this.permissions[id][key] = this.permissions["null"][key];
            }
        }
    }
    
    add(server, permission)
    {
        if(server === null)
        {
            this.permissions["null"][permission] = true;
            
            for(let key in this.permissions)
            {
                if(this.permissions[key][permission] === undefined)
                    this.permissions[key][permission] = true;
            }
        }
        else
        {
            this.setup(server.id);
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
            this.setup(server.id);
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

        this.setup(server.id);
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
        this.setup(server.id);
        return this.permissions[server.id];
    }
    
    save()
    {
        return new Promise((resolve, reject) => {
            this.dbrole.save().then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    }
    
    load()
    {
        return new Promise((resolve, reject) => {
            DBRole.findOne({name: this.name}).then(doc => {
                if(doc === null)
                {
                    this.dbrole = DBRole.create({name: this.name, permissions: this.permissions});
                    this.dbrole.save().then(() => {
                        resolve();
                    }).catch(err => {
                        reject(err);
                    });
                }
                else
                {
                    this.dbrole = doc;
                    this.permissions = this.dbrole.permissions;
                    resolve();
                }
            }).catch(err => {
                reject(err);
            });
        });
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

    save()
    {
        return new Promise((resolve, reject) => {
            this.roles["superadmin"].save().then(() => {
                return this.roles["admin"].save();
            }).then(() => {
                return this.roles["moderator"].save();
            }).then(() => {
                return this.roles["normal"].save();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    }
    
    load()
    {
        return new Promise((resolve, reject) => {
            this.roles["superadmin"].load().then(() => {
                return this.roles["admin"].load();
            }).then(() => {
                return this.roles["moderator"].load();
            }).then(() => {
                return this.roles["normal"].load();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
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
        this.roles[role].save();
        
        return true;
    }

    remove(name, role, server)
    {
        if(this.roles[role] === undefined)
            return false;

        this.roles[role].remove(server, name);
        this.roles[role].save();
        
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
