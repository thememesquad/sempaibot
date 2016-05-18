"use strict";

const IModule = require("../src/IModule.js");
const permissions = require("../src/permissions.js");
const responses = require("../src/responses.js");
const users = require("../src/users.js");
const Util = require("../src/util.js");

class AdminModule extends IModule
{
    constructor()
    {
        super();

        this.name = "Admin";
		this.description = "This is the permissions and roles module! Cannot be disabled.";
        this.always_on = true;

        permissions.register("BLACKLIST_SERVERS", "superadmin");
        permissions.register("BLACKLIST_USERS", "superadmin");
        permissions.register("IGNORE_USERS", "moderator");
        permissions.register("GO_TO_CHANNEL", "moderator");
        permissions.register("MANAGE_MODULES", "admin");
        permissions.register("MANAGE_PERMISSIONS", "admin");
        permissions.register("ASSIGN_ROLES", "admin");

        this.add_command({
            match: function(message, split){
                if(!message.content.startsWith("enable module"))
                    return null;
                    
                var mod = message.content.substr("enable module".length + 1).trim();
                if(mod.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [mod];
            },
            sample: "sempai enable module __*module name*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.add_command({
            match: function(message){
                if(!message.content.startsWith("disable module"))
                    return null;
                    
                var mod = message.content.substr("disable module".length + 1).trim();
                if(mod.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [mod];
            },
            sample: "sempai disable module __*module name*__",
            description: "Disables the specified module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.add_command({
            match: function(message){
                if(!message.content.startsWith("assign role"))
                    return null;
                    
                var split = message.content.split(" ");
                if(split.length !== 6)
                {
                    message.almost = true;
                    return null;
                }
                
                var role = split[2];
                var user = Util.parse_id(split[5]);
                
                if(user.type != "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [role.toLowerCase(), user.id.toLowerCase()];
            },
            sample: "sempai assign role __*role*__ to user __*@user*__",
            description: "Assigns the specified role to the specified user.",
            permission: "ASSIGN_ROLES",
            global: false,
            
            execute: this.handle_assign_role
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("add permission"))
                    return null;
                    
                var split = message.content.split(" ");
                if(split.length !== 6)
                {
                    message.almost = true;
                    return null;
                }
                
                var permission = split[2];
                var role = split[5];
                
                return [permission.toUpperCase(), role.toLowerCase()];
            },
            sample: "sempai add permission __*permission*__ to role __*role name*__",
            description: "Adds the specified permission to the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_add_permission
        });

        this.add_command({
            match: function(message){
                if(!message.content.startsWith("remove permission"))
                    return null;
                    
                var split = message.content.split(" ");
                if(split.length !== 6)
                {
                    message.almost = true;
                    return null;
                }
                
                var permission = split[2];
                var role = split[5];
                
                return [permission.toUpperCase(), role.toLowerCase()];
            },
            sample: "sempai remove permission __*permission*__ from role __*role*__",
            description: "Removes the specified permission from the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_remove_permission
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("list modules"))
                    return null;
                    
                return [];
            },
            sample: "sempai list modules",
            description: "Lists all available modules.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_list_modules
        });
        
        this.add_command({
            match: function(message, split){
                if(!message.content.startsWith("ignore"))
                    return null;
                    
                var mod = message.content.substr("ignore".length + 1).trim();
                if(mod.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                var user = Util.parse_id(mod);
                if(user.type != "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [user.id];
            },
            sample: "sempai ignore __*@user*__",
            description: "Ignores the specified user.",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_ignore_user
        });
        
        this.add_command({
            match: function(message, split){
                if(!message.content.startsWith("unignore"))
                    return null;
                    
                var mod = message.content.substr("unignore".length + 1).trim();
                if(mod.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                var user = Util.parse_id(mod);
                if(user.type != "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [user.id];
            },
            sample: "sempai unignore __*@user*__",
            description: "Stops ignoring the specified user.",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_unignore_user
        });
        
        this.add_command({
            match: function(message, split){
                if(!message.content.startsWith("go to"))
                    return null;
                    
                var mod = message.content.substr("go to".length + 1).trim();
                if(mod.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                var channel = Util.parse_id(mod);
                if(channel.type != "channel")
                {
                    message.almost = true;
                    return null;
                }
                
                return [channel.id];
            },
            sample: "sempai go to __*#channel*__",
            description: "Tells Sempai to output to the specified channel.",
            permission: "GO_TO_CHANNEL",
            global: false,
            
            execute: this.handle_goto_channel
        });
    }

    handle_enable_module(message, name)
    {
        var module = this.bot.get_module(name);
        if(module === null)
        {
            return this.bot.respond(message, responses.get("MODULE_INVALID").format({author: message.author.id, module: name}));
        }

        if(message.server.is_module_enabled(name))
        {
            return this.bot.respond(message, responses.get("MODULE_ALREADY_ENABLED").format({author: message.author.id, module: name}));
        }

        message.server.enable_module(name);
        return this.bot.respond(message, responses.get("MODULE_ENABLED").format({author: message.author.id, module: name}));
    }

    handle_disable_module(message, name)
    {
        var module = this.bot.get_module(name);
        if(module === null)
        {
            return this.bot.respond(message, responses.get("MODULE_INVALID").format({author: message.author.id, module: name}));
        }

        if(!message.server.is_module_enabled(name))
        {
            return this.bot.respond(message, responses.get("MODULE_NOT_ENABLED").format({author: message.author.id, module: name}));
        }

        if(module.always_on)
        {
            return this.bot.respond(message, responses.get("MODULE_ALWAYS_ON").format({author: message.author.id, module: name}));
        }

        message.server.disable_module(name);
        return this.bot.respond(message, responses.get("MODULE_DISABLED").format({author: message.author.id, module: name}));
    }

    handle_list_modules(message)
    {
        var columns = {name: "Name", enabled: "Enabled", flags: "Flags"};
        var data = [];
        
        for(var key in this.bot.modules)
        {
            var enabled = message.server.is_module_enabled(key);
            var always_on = this.bot.modules[key].always_on;
            
            data.push({name: key, enabled: (enabled) ? "yes" : "no", flags: (always_on) ? "always_on" : ""});
        }
        
        var messages = Util.generate_table(responses.get("MODULE_LIST").format({author: message.author.id}), columns, data, {name: 20, enabled: 10, flags: 15});
        this.bot.respond_queue(message, messages);
    }
    
    get_user(user_id, server)
    {
        return users.get_user_by_id(user_id, server);
    }
    
    handle_assign_role(message, role, user_id)
    {
        role = role.toLowerCase();
        
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: role}));
                
            case "admin":
                role_id = 1;
                break;
                
            case "moderator":
                role_id = 2;
                break;
                
            default:
                role_id = 3;
                break;
        }
        
        var my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        var user = this.get_user(user_id, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        if(user.get_role(message.server) === role)
        {
            return this.bot.respond(message, responses.get("ROLE_ALREADY_ASSIGNED").format({author: message.author.id, role: role, user: user_id}));
        }
        
        if(!users.assign_role(user.user_id, message.server, role))
        {
            return this.bot.respond(message, responses.get("ERROR").format({author: message.author.id}));
        }
        
        return this.bot.respond(message, responses.get("ROLE_ASSIGNED").format({author: message.author.id, role: role, user: user_id}));
    }
    
    handle_add_permission(message, permission, role)
    {
        permission = permission.toUpperCase();
        role = role.toLowerCase();
        
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: role}));
                
            case "admin":
                role_id = 1;
                break;
                
            case "moderator":
                role_id = 2;
                break;
                
            default:
                role_id = 3;
                break;
        }
        
        var my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        if(!permissions.is_allowed(permission, message.user.get_role(message.server), message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        permissions.add(permission, role, message.server);
        this.bot.respond(message, responses.get("ADDED_PERMISSION").format({author: message.author.id, permission: permission, role: role}));
    }

    handle_remove_permission(message, permission, role)
    {
        permission = permission.toUpperCase();
        role = role.toLowerCase();
        
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: role}));
                
            case "admin":
                role_id = 1;
                break;
                
            case "moderator":
                role_id = 2;
                break;
                
            default:
                role_id = 3;
                break;
        }
        
        var my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        if(!permissions.is_allowed(permission, message.user.get_role(message.server), message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        permissions.remove(permission, role, message.server);
        this.bot.respond(message, responses.get("REMOVED_PERMISSION").format({author: message.author.id, permission: permission, role: role}));
    }
    
    handle_goto_channel(message, channel)
    {
        var id = channel;
        if(message.server.server.channels.get("id", id) === null)
        {
            return this.bot.respond(message, responses.get("INVALID_CHANNEL").format({author: message.author.id, channel: channel}));
        }
        
        message.server.channel = id;
        this.bot.message(responses.get("OUTPUT_CHANNEL").format({author: message.author.id, channel: id}), message.server);
    }
    
    handle_ignore_user(message, user_id)
    {
        var user = this.get_user(user_id, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        message.server.ignore_user(user);
        return this.bot.respond(message, responses.get("STARTED_IGNORING").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_unignore_user(message, user_id)
    {
        var user = this.get_user(user_id, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        message.server.unignore_user(user);
        return this.bot.respond(message, responses.get("STOPPED_IGNORING").format({author: message.author.id, user: user.user_id}));
    }
    
    on_setup(bot)
    {
        this.bot = bot;
    }

    on_load(server)
    {
    }

    on_unload(server)
    {
    }
}

module.exports = new AdminModule();
