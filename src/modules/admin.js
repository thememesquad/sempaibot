"use strict";

const ModuleBase = require("../modulebase.js");
const permissions = require("../permissions.js");
const responses = require("../responses.js");
const users = require("../users.js");
const util = require("../util.js");
const stats = require("../stats.js");

class AdminModule extends ModuleBase
{
    constructor()
    {
        super();

        this.name = "Admin";
        this.description = "This is the permissions and roles module! Cannot be disabled.";
        this.always_on = true;
        this.hidden = true;

        permissions.register("SUPERADMIN", "superadmin");
        permissions.register("IGNORE_USERS", "moderator");
        permissions.register("GO_TO_CHANNEL", "moderator");
        permissions.register("MANAGE_MODULES", "admin");
        permissions.register("MANAGE_PERMISSIONS", "admin");
        permissions.register("ASSIGN_ROLES", "admin");

        this.add_command({
            formats: [
                "show statistics"
            ],
            sample: "show statistics",
            description: "Shows statistics for me server-wide.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_statistics
        });
        
        this.add_command({
            formats: [
                "list servers",
                "show servers"
            ],
            sample: "list servers",
            description: "Lists all the servers I'm currently running on.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_list_servers
        });
        
        this.add_command({
            formats: [
                "blacklist server {i!server}"
            ],
            sample: "blacklist server __*server*__",
            description: "Blacklists a server.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_blacklist_server
        });
        
        this.add_command({
            formats: [
                "whitelist server {i!server}"
            ],
            sample: "whitelist server __*server*__",
            description: "Whitelists a server.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_whitelist_server
        });
        
        this.add_command({
            formats: [
                "blacklist user {uid!user}"
            ],
            sample: "blacklist user __*@user*__",
            description: "Blacklists an user.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_blacklist_user
        });
        
        this.add_command({
            formats: [
                "whitelist user {uid!user}"
            ],
            sample: "whitelist user __*@user*__",
            description: "Whitelists an user.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_whitelist_user
        });
        
        this.add_command({
            formats: [
                "show user blacklist"
            ],
            sample: "show user blacklist",
            description: "Displays the user blacklist",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_user_blacklist
        });
        
        this.add_command({
            formats: [
                "show server blacklist"
            ],
            sample: "show server blacklist",
            description: "Displays the server blacklist",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_server_blacklist
        });
        
        this.add_command({
            formats: [
                "enable {module}",
                "enable module {module}"
            ],
            sample: "enable __*module name*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.add_command({
            formats: [
                "disable {module}",
                "disable module {module}"
            ],
            sample: "disable __*module name*__",
            description: "Disables the specified module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.add_command({
            formats: [
                "assign role {role} to user {uid!user}",
                "assign {role} to user {uid!user}",
                "assign role {role} to {uid!user}",
                "assign {role} to {uid!user}",
                "assign {role} {uid!user}"
            ],
            sample: "assign __*role*__ to __*@user*__",
            description: "Assigns the specified role to the specified user.",
            permission: "ASSIGN_ROLES",
            global: false,
            
            execute: this.handle_assign_role
        });
        
        this.add_command({
            formats: [
                "add permission {permission} to role {role}",
                "add {permission} to role {role}",
                "add permission {permission} to {role}",
                "add {permission} {role}"
            ],
            sample: "add __*permission*__ to __*role*__",
            description: "Adds the specified permission to the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_add_permission
        });

        this.add_command({
            formats: [
                "remove permission {permission} from role {role}",
                "remove {permission} from role {role}",
                "remove permission {permission} from {role}",
                "remove {permission} {role}"
            ],
            sample: "remove __*permission*__ from __*role*__",
            description: "Removes the specified permission from the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_remove_permission
        });
        
        this.add_command({
            formats: [
                "list modules",
                "show modules"
            ],
            sample: "list modules",
            description: "Lists all available modules.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_list_modules
        });
        
        this.add_command({
            formats: [
                "ignore {uid!user}",
                "start ignoring {uid!user}"
            ],
            sample: "ignore __*@user*__",
            description: "Ignores the specified user.",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_ignore_user
        });
        
        this.add_command({
            formats: [
                "unignore {uid!user}",
                "stop ignoring {uid!user}"
            ],
            sample: "unignore __*@user*__",
            description: "Stops ignoring the specified user.",
            permission: "IGNORE_USERS",
            global: false,
            
            execute: this.handle_unignore_user
        });
        
        this.add_command({
            formats: [
                "go to {cid!channel}"
            ],
            sample: "go to __*#channel*__",
            description: "Tells me to output to the specified channel.",
            permission: "GO_TO_CHANNEL",
            global: false,
            
            execute: this.handle_goto_channel
        });
    }

    handle_blacklist_server(message, args)
    {
        let server = this.bot.get_server_internal(args.server - 1);
        
        if(server === null)
        {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({author: message.author.id, id: args.server}));
        }
        
        if(this.bot.is_server_blacklisted(server.id))
            return this.bot.respond(message, responses.get("SERVER_ALREADY_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
        
        this.bot.blacklist_server(server.id);
        this.bot.respond(message, responses.get("SERVER_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
    }
    
    handle_whitelist_server(message, args)
    {
        let server = this.bot.get_server_internal(args.server - 1);
        
        if(server === null)
        {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({author: message.author.id, id: args.server}));
        }
        
        if(!this.bot.is_server_blacklisted(server.id))
            return this.bot.respond(message, responses.get("SERVER_NOT_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
        
        this.bot.whitelist_server(server.id);
        this.bot.respond(message, responses.get("SERVER_WHITELISTED").format({author: message.author.id, server_name: server.server.name}));
    }
    
    handle_blacklist_user(message, args)
    {
        let user = this.get_user(args.user, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: args.user}));
        }
        
        this.bot.blacklist_user(user);
        return this.bot.respond(message, responses.get("BLACKLISTED_USER").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_whitelist_user(message, args)
    {
        let user = this.get_user(args.user, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: args.user}));
        }
        
        this.bot.whitelist_user(user);
        return this.bot.respond(message, responses.get("WHITELISTED_USER").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_show_user_blacklist(message, args)
    {
        let id = "ID";
        let name = "Name";
        
        while(id.length < 25)
            id += " ";
        
        while(name.length < 30)
            name += " ";
        
        let response = "```";
        response += id + " " + name;
        
        let num = 0;
        for(let key in users.users)
        {
            if(!this.bot.is_user_blacklisted(users.users[key]))
                continue;
            
            id = "" + users.users[key].user_id;
            name = users.users[key].name;
            
            while(id.length < 25)
                id += " ";

            while(name.length < 30)
                name += " ";
            
            response += "\r\n";
            response += id + " " + name;
            num++;
        }
        
        if(num === 0)
        {
            response += "\r\n";
            response += "User blacklist is empty.";
        }
        
        response += "```";
        
        this.bot.respond(message, responses.get("USER_BLACKLIST").format({author: message.author.id, response: response}));
    }
    
    handle_show_server_blacklist(message, args)
    {
        let id = "ID";
        let name = "Name";
        let owner = "Owner";
        
        while(id.length < 10)
            id += " ";
        
        while(name.length < 20)
            name += " ";
        
        while(owner.length < 20)
            owner += " ";
        
        let response = "```";
        response += id + " " + name + " " + owner;
        
        let num = 0;
        for(let i = 0;i<this.bot.servers_internal.length;i++)
        {
            if(!this.bot.is_server_blacklisted(this.bot.servers_internal[i].id))
                continue;
            
            id = "#" + (i + 1) + ".";
            name = this.bot.servers_internal[i].server.name;
            owner = this.bot.servers_internal[i].server.owner.name;
            
            while(id.length < 10)
                id += " ";

            while(name.length < 20)
                name += " ";

            while(owner.length < 20)
                owner += " ";
            
            response += "\r\n";
            response += id + " " + name + " " + owner;
            num++;
        }
        
        if(num === 0)
        {
            response += "\r\n";
            response += "Server blacklist is empty.";
        }
        response += "```";
        
        this.bot.respond(message, responses.get("SERVER_BLACKLIST").format({author: message.author.id, response: response}));
    }
    
    handle_show_statistics(message, args)
    {
        let msg = responses.get("SHOW_STATISTICS").format({
            author: message.author.id,
            num_servers: stats.get_value("num_servers"),
            osu_num_users: stats.get_value("osu_num_users"),
            osu_last_minute: stats.get_value("osu_api_calls"),
            osu_average_day: stats.get_average_day_value("osu_api_calls"),
            osu_average_week: stats.get_average_week_value("osu_api_calls"),
            osu_average_month: stats.get_average_month_value("osu_api_calls"),
            osu_highest_day: stats.get_highest_day_value("osu_api_calls"),
            osu_highest_week: stats.get_highest_week_value("osu_api_calls"),
            osu_highest_month: stats.get_highest_month_value("osu_api_calls"),
            osu_last_day: stats.get_day_value("osu_api_calls"),
            osu_last_week: stats.get_week_value("osu_api_calls"),
            osu_last_month: stats.get_month_value("osu_api_calls"),
            osu_alltime: stats.get_alltime_value("osu_api_calls"),
            osu_api_queue: this.bot.get_module("osu!").load_balancer.numRequests
        });
        
        this.bot.respond(message, msg);
    }
    
    handle_list_servers(message, args)
    {
        let data = [];
        for(let i = 0;i<this.bot.servers_internal.length;i++)
        {
            if(this.bot.is_server_blacklisted(this.bot.servers_internal[i].id))
            {
                continue;
            }
            
            data.push({
                id: "#" + (i + 1) + ".",
                name: this.bot.servers_internal[i].server.name,
                owner: this.bot.servers_internal[i].server.owner.nickname || this.bot.servers_internal[i].server.owner.user.username,
                limit: "" + this.bot.servers_internal[i].config.value.osu_limit
            });
        }
        
        let messages = util.generate_table(responses.get("LIST_SERVERS").format({author: message.author.id}), {id: "ID", name: "Name", owner: "Owner", limit: "Limit"}, data);
        this.bot.respond_queue(message, messages);
    }
    
    handle_enable_module(message, args)
    {
        if(this.bot.get_module(args.module) === null)
        {
            return this.bot.respond(message, responses.get("MODULE_INVALID").format({author: message.author.id, module: args.module}));
        }

        if(message.server.is_module_enabled(args.module))
        {
            return this.bot.respond(message, responses.get("MODULE_ALREADY_ENABLED").format({author: message.author.id, module: args.module}));
        }

        message.server.enable_module(args.module);
        return this.bot.respond(message, responses.get("MODULE_ENABLED").format({author: message.author.id, module: args.module}));
    }

    handle_disable_module(message, args)
    {
        let module = this.bot.get_module(args.module);
        if(module === null)
        {
            return this.bot.respond(message, responses.get("MODULE_INVALID").format({author: message.author.id, module: args.module}));
        }

        if(!message.server.is_module_enabled(args.module))
        {
            return this.bot.respond(message, responses.get("MODULE_NOT_ENABLED").format({author: message.author.id, module: args.module}));
        }

        if(module.always_on)
        {
            return this.bot.respond(message, responses.get("MODULE_ALWAYS_ON").format({author: message.author.id, module: args.module}));
        }

        message.server.disable_module(args.module);
        return this.bot.respond(message, responses.get("MODULE_DISABLED").format({author: message.author.id, module: args.module}));
    }

    handle_list_modules(message, args)
    {
        let columns = {name: "Name", enabled: "Enabled", flags: "Flags"};
        let data = [];
        
        for(let key in this.bot.modules)
        {
            let enabled = message.server.is_module_enabled(key);
            let always_on = this.bot.modules[key].always_on;
            let default_on = this.bot.modules[key].default_on;
            let hidden = this.bot.modules[key].hidden;

            if(hidden)
                continue;
            
            let flags = "";
            if(always_on)
                flags += "always_on";
            
            if(default_on)
                flags += flags.length === 0 ? "default_on" : " default_on";
            
            data.push({name: key, enabled: (enabled) ? "yes" : "no", flags: flags});
        }
        
        let messages = util.generate_table(responses.get("MODULE_LIST").format({author: message.author.id}), columns, data, {name: 20, enabled: 10, flags: 15});
        this.bot.respond_queue(message, messages);
    }
    
    get_user(user_id, server)
    {
        return users.get_user_by_id(user_id, server);
    }
    
    handle_assign_role(message, args)
    {
        args.role = args.role.toLowerCase();
        
        let role_id = 0;
        switch(args.role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: args.role}));
                
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
        
        let my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        let user = this.get_user(args.user, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: args.user}));
        }
        
        if(user.get_role(message.server) === args.role)
        {
            return this.bot.respond(message, responses.get("ROLE_ALREADY_ASSIGNED").format({author: message.author.id, role: args.role, user: args.user}));
        }
        
        if(!users.assign_role(user.user_id, message.server, args.role))
        {
            return this.bot.respond(message, responses.get("ERROR").format({author: message.author.id}));
        }
        
        return this.bot.respond(message, responses.get("ROLE_ASSIGNED").format({author: message.author.id, role: role, user: args.user}));
    }
    
    handle_add_permission(message, args)
    {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();
        
        let role_id = 0;
        switch(args.role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: args.role}));
                
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
        
        let my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        if(!permissions.is_allowed(args.permission, message.user.get_role(message.server), message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        permissions.add(args.permission, args.role, message.server);
        this.bot.respond(message, responses.get("ADDED_PERMISSION").format({author: message.author.id, permission: args.permission, role: args.role}));
    }

    handle_remove_permission(message, args)
    {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();
        
        let role_id = 0;
        switch(args.role)
        {
            case "superadmin":
                return this.bot.respond(message, responses.get("INVALID_ROLE").format({author: message.author.id, role: args.role}));
                
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
        
        let my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        if(!permissions.is_allowed(args.permission, message.user.get_role(message.server), message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        permissions.remove(args.permission, args.role, message.server);
        this.bot.respond(message, responses.get("REMOVED_PERMISSION").format({author: message.author.id, permission: args.permission, role: args.role}));
    }
    
    handle_goto_channel(message, args)
    {
        let id = args.channel;
        if(message.server.server.channels.get("id", id) === null)
        {
            return this.bot.respond(message, responses.get("INVALID_CHANNEL").format({author: message.author.id, channel: args.channel}));
        }
        
        message.server.channel = id;
        this.bot.message(responses.get("OUTPUT_CHANNEL").format({author: message.author.id, channel: id}), message.server);
    }
    
    handle_ignore_user(message, args)
    {
        let user = this.get_user(args.user, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: args.user}));
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        message.server.ignore_user(user);
        return this.bot.respond(message, responses.get("STARTED_IGNORING").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_unignore_user(message, args)
    {
        let user = this.get_user(args.user, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: args.user}));
        }
        
        if(message.user.get_role_id(message.server) >= user.get_role_id(message.server))
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        message.server.unignore_user(user);
        return this.bot.respond(message, responses.get("STOPPED_IGNORING").format({author: message.author.id, user: user.user_id}));
    }
    
    on_setup()
    {
    }

    on_shutdown()
    {
    }
    
    on_load()
    {
    }

    on_unload()
    {
    }
}

module.exports = new AdminModule();
