"use strict";

const IModule = require("../src/IModule.js");
const permissions = require("../src/permissions.js");
const responses = require("../src/responses.js");
const users = require("../src/users.js");

class AdminModule extends IModule
{
    constructor()
    {
        super();

        this.name = "Admin";
        this.always_on = true;

        permissions.register("BLACKLIST_SERVERS", "superadmin");
        permissions.register("BLACKLIST_USERS", "superadmin");
        permissions.register("IGNORE_USERS", "moderator");
        permissions.register("GOTO_CHANNEL", "moderator");
        permissions.register("MANAGE_MODULES", "admin");
        permissions.register("MANAGE_PERMISSIONS", "admin");
        permissions.register("ASSIGN_ROLES", "admin");

        this.add_command({
            regex: /\senable module (.*)/i,
            sample: "sempai enable module __*module*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.add_command({
            regex: /\sdisable module (.*)/i,
            sample: "sempai disable module __*module*__",
            description: "Disables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.add_command({
            regex: /\sassign role (.*) to user (.*)/i,
            sample: "sempai assign role __*role*__ to user __*@user*__",
            description: "Assigns a role to a user",
            permission: "ASSIGN_ROLES",
            global: false,
            
            execute: this.handle_assign_role
        });
        
        this.add_command({
            regex: /\sadd permission (.*) to role (.*)/i,
            sample: "sempai add permission __*permission*__ to role __*role*__",
            description: "Adds a permission to the role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_add_permission
        });

        this.add_command({
            regex: /\sremove permission (.*) from role (.*)/i,
            sample: "sempai remove permission __*permission*__ from role __*role*__",
            description: "Removes a permission from the role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_remove_permission
        });
        
        this.add_command({
            regex: /\slist modules/i,
            sample: "sempai list modules",
            description: "Lists all the available modules for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_list_modules
        });
        
        this.add_command({
            regex: /\signore (.*)/i,
            sample: "sempai ignore __*@user*__",
            description: "Ignores a user on this server",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_ignore_user
        });
        
        this.add_command({
            regex: /\sunignore (.*)/i,
            sample: "sempai unignore __*@user*__",
            description: "Stops ignoring user on this server",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_unignore_user
        });
        
        this.add_command({
            regex: /\sgo to (.*)/i,
            sample: "sempai go to __*#channel*__",
            description: "Tells sempai to output only to a channel (unless its a response)",
            permission: "GOTO_CHANNEL",
            global: false,
            
            execute: this.handle_goto_channel
        })
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
        var response = "```"
        
        for(var key in this.bot.modules)
        {
            var enabled = message.server.is_module_enabled(key);
            var always_on = this.bot.modules[key].always_on;
            
            var name = key;
            while(name.length != 20)
                name += " ";
                
            response += name + " " + (enabled ? "(enabled)" : "(disabled)");
            if(always_on)
                response += " (always_on)";
                
            response += "\r\n";
        }
        
        response += "```";
        this.bot.respond(message, responses.get("MODULE_LIST").format({author: message.author.id, modules: response}));
    }
    
    get_user(user_id)
    {
        var id = user_id.substr(2, user_id.length - 3);
        return users.get_user_by_id(id);
    }
    
    handle_assign_role(message, role, user_id)
    {
        if(role === "superadmin")
        {
            return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: role}));
        }
        
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return false; //we can't assign new superadmins
                
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
        
        var my_role = 0;
        switch(message.user.get_role(message.server))
        {
            case "superadmin":
                my_role = 0;
                break;
                
            case "admin":
                my_role = 1;
                break;
                
            case "moderator":
                my_role = 2;
                break;
                
            default:
                my_role = 3;
                break;
        }
        
        if(role_id < my_role)
        {
            //not allowed to assign higher roles
            return;
        }
        
        var user = this.get_user(user_id);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        if(user.get_role(message.server) === role)
        {
            return this.bot.respond(message, responses.get("ROLE_ALREADY_ASSIGNED").format({author: message.author.id, role: role, user: user_id}));
        }
        
        if(!users.assign_role(user._id, message.server, role))
        {
            return this.bot.respond(message, responses.get("ERROR").format({author: message.author.id}));
        }
        
        return this.bot.respond(message, responses.get("ROLE_ASSIGNED").format({author: message.author.id, role: role, user: user_id}));
    }
    
    handle_add_permission(message, permission, role)
    {
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return false; //we can't add permissions to the superadmin
                
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
        
        var my_role = 0;
        switch(message.user.get_role(message.server))
        {
            case "superadmin":
                my_role = 0;
                break;
                
            case "admin":
                my_role = 1;
                break;
                
            case "moderator":
                my_role = 2;
                break;
                
            default:
                my_role = 3;
                break;
        }
        
        if(role_id < my_role)
        {
            //not allowed to change higher roles (ie, moderator can't change an admin)
            return;
        }
        
        if(!permissions.is_allowed(permission, message.user.get_role(message.server), message.server))
        {
            //not allowed to add a permission if your role doesn't even have that permission
            return;
        }
        
        permissions.add(permission, role, message.server);
        
        //TODO: Add responses for this command
    }

    handle_remove_permission(message, permission, role)
    {
        var role_id = 0;
        switch(role)
        {
            case "superadmin":
                return false; //we can't remove permissions from the superadmin
                
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
        
        var my_role = 0;
        switch(message.user.get_role(message.server))
        {
            case "superadmin":
                my_role = 0;
                break;
                
            case "admin":
                my_role = 1;
                break;
                
            case "moderator":
                my_role = 2;
                break;
                
            default:
                my_role = 3;
                break;
        }
        
        if(role_id < my_role)
        {
            //not allowed to change higher roles (ie, moderator can't change an admin)
            return;
        }
        
        if(!permissions.is_allowed(permission, message.user.get_role(message.server), message.server))
        {
            //not allowed to remove a permission if your role doesn't even have that permission
            return;
        }
        
        permissions.remove(permission, role, message.server);
        
        //TODO: Add responses for this command
    }
    
    handle_goto_channel(message, channel)
    {
        var id = channel.substr(2, channel.length - 3);
        if(message.server.server.channels.get("id", id) === null)
        {
            return this.bot.respond(message, responses.get("INVALID_CHANNEL").format({author: message.author.id, channel: channel}));
        }
        
        message.server.channel = id;
        this.bot.respond(message, responses.get("OUTPUT_CHANNEL").format({author: message.author.id, channel: id}));
    }
    
    handle_ignore_user(message, user_id)
    {
        var user = users.get_user_by_id(user_id.substr(2, user_id.length - 3));
        if(user === null)
        {
            //no such user
            return;
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            //not allowed
            return;
        }
        
        message.server.ignore_user(user);
        //started ignoring user
    }
    
    handle_unignore_user(message, user_id)
    {
        var user = users.get_user_by_id(user_id.substr(2, user_id.length - 3));
        if(user === null)
        {
            //no such user
            return;
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            //not allowed
            return;
        }
        
        message.server.unignore_user(user);
        //stopped ignoring user
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
