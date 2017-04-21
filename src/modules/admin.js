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

        permissions.register("SUPERADMIN", "superadmin");
        permissions.register("IGNORE_USERS", "moderator");
        permissions.register("GO_TO_CHANNEL", "moderator");
        permissions.register("MANAGE_MODULES", "admin");
        permissions.register("MANAGE_PERMISSIONS", "admin");
        permissions.register("ASSIGN_ROLES", "admin");

        this.add_command({
            match: message => {
                if(!message.content.startsWith("show statistics"))
                    return null;
                
                return [];
            },
            sample: "sempai show statistics",
            description: "Shows statistics for sempai server-wide.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_statistics
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("list servers"))
                    return null;
                
                return [];
            },
            sample: "sempai list servers",
            description: "Lists all the servers sempai is currently running on.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_list_servers
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("blacklist server"))
                    return null;
                
                return [parseInt(message.content.split(" ")[2])];
            },
            sample: "sempai blacklist server __*server*__",
            description: "Blacklists a server.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_blacklist_server
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("whitelist server"))
                    return null;
                
                return [parseInt(message.content.split(" ")[2])];
            },
            sample: "sempai whitelist server __*server*__",
            description: "Whitelists a server.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_whitelist_server
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("blacklist user"))
                    return null;
                
                let mod = message.content.substr("blacklist user".length + 1).trim();
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let user = util.parse_id(mod);
                if(user.type !== "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [user.id];
            },
            sample: "sempai blacklist user __*@user*__",
            description: "Blacklists an user.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_blacklist_user
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("whitelist user"))
                    return null;
                
                let mod = message.content.substr("blacklist user".length + 1).trim();
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let user = util.parse_id(mod);
                if(user.type !== "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [user.id];
            },
            sample: "sempai whitelist user __*@user*__",
            description: "Whitelists an user.",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_whitelist_user
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("show user blacklist"))
                    return null;
                
                return [];
            },
            sample: "sempai show user blacklist",
            description: "Displays the user blacklist",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_user_blacklist
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("show server blacklist"))
                    return null;
                
                return [];
            },
            sample: "sempai show server blacklist",
            description: "Displays the server blacklist",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_show_server_blacklist
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("enable"))
                    return null;
                    
                let mod = message.content.startsWith("enable module") ? message.content.substr("enable module".length + 1) : message.content.substr("enable".length + 1);
                mod = mod.trim();
                
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [mod];
            },
            sample: "sempai enable __*module name*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.add_command({
            match: message => {
                if(!message.content.startsWith("disable"))
                    return null;
                    
                let mod = message.content.startsWith("disable module") ? message.content.substr("disable module".length + 1) : message.content.substr("disable".length + 1);
                mod = mod.trim();
                
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [mod];
            },
            sample: "sempai disable __*module name*__",
            description: "Disables the specified module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.add_command({
            match: message => {
                if(!message.content.startsWith("assign"))
                    return null;
                    
                let needs = 6;
                let split = message.content.split(" ");
                
                let idx1 = 2;
                let idx2 = 5;
                
                if(split[2] === "to")
                {
                    idx1 = 1;
                    idx2--;
                    
                    needs--;
                }
                
                if((needs === 5 && split.length === 4) || (needs === 6 && split.length === 5))
                {
                    if(needs === 5 && split.length === 4)
                        idx2 = 3;
                    else if(needs === 6 && split.length === 5)
                        idx2 = 4;
                    
                    needs--;
                }
                
                if(split.length !== needs)
                {
                    message.almost = true;
                    return null;
                }
                
                let role = split[idx1];
                let user = util.parse_id(split[idx2]);
                
                if(user.type !== "user")
                {
                    message.almost = true;
                    return null;
                }
                
                return [role.toLowerCase(), user.id.toLowerCase()];
            },
            sample: "sempai assign __*role*__ to __*@user*__",
            description: "Assigns the specified role to the specified user.",
            permission: "ASSIGN_ROLES",
            global: false,
            
            execute: this.handle_assign_role
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("add"))
                    return null;
                
                let needs = 6;
                let idx1 = 2;
                let idx2 = 5;
                let split = message.content.split(" ");
                
                if(split[2] === "to")
                {
                    idx1 = 1;
                    idx2--;
                    
                    needs--;
                }
                
                if((needs === 5 && split.length === 4) || (needs === 6 && split.length === 5))
                {
                    if(needs === 5 && split.length === 4)
                        idx2 = 3;
                    else if(needs === 6 && split.length === 5)
                        idx2 = 4;
                    
                    needs--;
                }
                
                if(split.length !== needs)
                {
                    message.almost = true;
                    return null;
                }
                
                let permission = split[idx1];
                let role = split[idx2];
                
                return [permission.toUpperCase(), role.toLowerCase()];
            },
            sample: "sempai add __*permission*__ to __*role*__",
            description: "Adds the specified permission to the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_add_permission
        });

        this.add_command({
            match: message => {
                if(!message.content.startsWith("remove"))
                    return null;
                
                let needs = 6;
                let idx1 = 2;
                let idx2 = 5;
                let split = message.content.split(" ");
                
                if(split[2] === "from")
                {
                    idx1 = 1;
                    idx2--;
                    
                    needs--;
                }
                
                if((needs === 5 && split.length === 4) || (needs === 6 && split.length === 5))
                {
                    if(needs === 5 && split.length === 4)
                        idx2 = 3;
                    else if(needs === 6 && split.length === 5)
                        idx2 = 4;
                    
                    needs--;
                }
                if(split.length !== needs)
                {
                    message.almost = true;
                    return null;
                }
                
                let permission = split[idx1];
                let role = split[idx2];
                
                return [permission.toUpperCase(), role.toLowerCase()];
            },
            sample: "sempai remove __*permission*__ from __*role*__",
            description: "Removes the specified permission from the specified role.",
            permission: "MANAGE_PERMISSIONS",
            global: false,
            
            execute: this.handle_remove_permission
        });
        
        this.add_command({
            match: message => {
                if(!message.content.startsWith("list modules") && 
                   !message.content.startsWith("show modules"))
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
            match: message => {
                if(!message.content.startsWith("ignore"))
                    return null;
                    
                let mod = message.content.substr("ignore".length + 1).trim();
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let user = util.parse_id(mod);
                if(user.type !== "user")
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
            match: message => {
                if(!message.content.startsWith("unignore") && !message.content.startsWith("stop ignoring"))
                    return null;
                    
                let mod = (message.content.startsWith("unignore")) ? message.content.substr("unignore".length + 1).trim() : message.content.substr("stop ignoring".length + 1).trim();
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let user = util.parse_id(mod);
                if(user.type !== "user")
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
            match: message => {
                if(!message.content.startsWith("go to"))
                    return null;
                    
                let mod = message.content.startsWith("go to channel") ? message.content.substr("go to channel".length + 1).trim() : message.content.substr("go to".length + 1).trim();
                if(mod.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                let channel = util.parse_id(mod);
                if(channel.type !== "channel")
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

    handle_blacklist_server(message, serverID)
    {
        let server = this.bot.get_server_internal(serverID - 1);
        
        if(server === null)
        {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({author: message.author.id, id: serverID}));
        }
        
        if(this.bot.is_server_blacklisted(server.id))
            return this.bot.respond(message, responses.get("SERVER_ALREADY_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
        
        this.bot.blacklist_server(server.id);
        this.bot.respond(message, responses.get("SERVER_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
    }
    
    handle_whitelist_server(message, serverID)
    {
        let server = this.bot.get_server_internal(serverID - 1);
        
        if(server === null)
        {
            return this.bot.respond(message, responses.get("INVALID_SERVER").format({author: message.author.id, id: serverID}));
        }
        
        if(!this.bot.is_server_blacklisted(server.id))
            return this.bot.respond(message, responses.get("SERVER_NOT_BLACKLISTED").format({author: message.author.id, server_name: server.server.name}));
        
        this.bot.whitelist_server(server.id);
        this.bot.respond(message, responses.get("SERVER_WHITELISTED").format({author: message.author.id, server_name: server.server.name}));
    }
    
    handle_blacklist_user(message, user_id)
    {
        let user = this.get_user(user_id, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        this.bot.blacklist_user(user);
        return this.bot.respond(message, responses.get("BLACKLISTED_USER").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_whitelist_user(message, user_id)
    {
        let user = this.get_user(user_id, message.server);
        if(user === null)
        {
            return this.bot.respond(message, responses.get("INVALID_USER").format({author: message.author.id, user: user_id}));
        }
        
        this.bot.whitelist_user(user);
        return this.bot.respond(message, responses.get("WHITELISTED_USER").format({author: message.author.id, user: user.user_id}));
    }
    
    handle_show_user_blacklist(message)
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
    
    handle_show_server_blacklist(message)
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
    
    handle_show_statistics(message)
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
    
    handle_list_servers(message)
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
    
    handle_enable_module(message, name)
    {
        let module = this.bot.get_module(name);
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
        let module = this.bot.get_module(name);
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
    
    handle_assign_role(message, role, user_id)
    {
        role = role.toLowerCase();
        
        let role_id = 0;
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
        
        let my_role = message.user.get_role_id(message.server);
        if(role_id < my_role)
        {
            return this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id}));
        }
        
        let user = this.get_user(user_id, message.server);
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
        
        let role_id = 0;
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
        
        let my_role = message.user.get_role_id(message.server);
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
        
        let role_id = 0;
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
        
        let my_role = message.user.get_role_id(message.server);
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
        let id = channel;
        if(message.server.server.channels.get("id", id) === null)
        {
            return this.bot.respond(message, responses.get("INVALID_CHANNEL").format({author: message.author.id, channel: channel}));
        }
        
        message.server.channel = id;
        this.bot.message(responses.get("OUTPUT_CHANNEL").format({author: message.author.id, channel: id}), message.server);
    }
    
    handle_ignore_user(message, user_id)
    {
        let user = this.get_user(user_id, message.server);
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
        let user = this.get_user(user_id, message.server);
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
