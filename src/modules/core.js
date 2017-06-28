"use strict";

const responses = require("../responses.js");
const permissions = require("../permissions.js");
const ModuleBase = require("../modulebase.js");
const users = require("../users.js");
const util = require("../util.js");
const config = require("../../config.js");

class CoreModule extends ModuleBase
{
    constructor()
    {
        super();

        this.name = "Core";
        this.description = "This is the core module! Cannot be disabled.";
        this.always_on = true;
        this.hidden = true;

        permissions.register("CHANGE_PERSONALITY", "moderator");

        this.add_command({
            default: {please: false, german: false},
            formats: [
                ["please help", {please: true}],
                ["hilfe", {german: true}],
                ["please show help", {please: true}],
                ["hilfe bitte", {german: true, please: true}],
                ["help me please", {please: true}],
                ["please help me", {please: true}],
                "help",
                "help me",
                "show help"
            ],
            hide_in_help: true,
            permission: null,
            global: true,

            execute: this.handle_help_me
        });

        this.add_command({
            default: {on: false},
            formats: [
                ["tsundere on", {on: true}],
                "tsundere off"
            ],
            hide_in_help: true,
            permission: "CHANGE_PERSONALITY",
            global: false,

            execute: this.handle_tsundere
        });
        
        this.add_command({
            defaults: {},
            formats: [
                "what is my role"
            ],
            sample: "what is my role?",
            description: "Displays your role.",
            permission: null,
            global: false,
            
            execute: this.handle_my_role
        });
        
        this.add_command({
            defaults: {},
            formats: [
                "what are my permissions",
                "show my permissions",
                "show my permission list",
                "show my permissions list",
                "list my permissions",
                "show permissions"
            ],
            sample: "what are my permissions?",
            description: "Displays your role's permissions.",
            permission: null,
            global: false,
            
            execute: this.handle_my_permissions
        });
        
        this.add_command({
            defaults: {},
            formats: [
                "list roles"
            ],
            sample: "list roles",
            description: "Lists every user's role.",
            permission: null,
            global: false,
            
            execute: this.handle_list_roles
        });
        
        this.add_command({
            defaults: {},
            formats: [
                "list permissions"
            ],
            sample: "list permissions",
            description: "Lists the available permissions for each role.",
            permission: null,
            global: false,
            
            execute: this.handle_list_permissions
        });
        
        this.add_command({
            defaults: {},
            formats: [
                "show ignore list",
                "list ignores",
                "show ignorelist"
            ],
            sample: "show ignore list",
            description: "Shows the list of people I'm currently ignoring!",
            permission: null,
            global: false,
            
            execute: this.handle_show_ignorelist
        });
    }

    handle_list_roles(message, args)
    {
        let server = message.server;
        let tmp = [];
        
        for(let i = 0;i<server.server.members.length;i++)
        {
            let user = users.get_user_by_id(server.server.members[i].id, server);
            if(server.server.members[i].id === this.bot.user.user_id)
                continue;
                
            if(user.get_role_id(server) === 0)
                continue;
                
            tmp.push(user);
        }
        
        tmp.sort((a, b) => {
            return a.get_role_id(server) - b.get_role_id(server);
        });
        
        let columns = {name: "Name", role: "Role"};
        let data = [];
        
        for(let i = 0;i<tmp.length;i++)
        {
            data.push({name: tmp[i].get_name_detailed(server), role: tmp[i].get_role(server)});
        }
        
        let messages = util.generate_table(responses.get("LIST_ROLES").format({author: message.author.id}), columns, data, {name: 30, role: 15});
        this.bot.respond_queue(message, messages);
    }
    
    handle_list_permissions(message, args)
    {
        let server = message.server;
        let admin_permissions = permissions.get_role("admin").get_permissions(server);
        
        let columns = {permission: "Permission", roles: "Roles"};
        let data = [];
        let roles = ["admin", "moderator", "normal"];
        
        for(let key in admin_permissions)
        {
            if(!admin_permissions[key])
                continue;
                
            let tmp = "";
            for(let i = 0;i<roles.length;i++)
            {
                let role = roles[i];
                    
                if(!permissions.get_role(role).is_allowed(server, key))
                    continue;
                    
                if(tmp.length !== 0)
                    tmp += " ";
                    
                tmp += role;
            }
            
            data.push({permission: key.toLowerCase(), roles: tmp});
        }
        
        data.sort((a, b) => {
            if(a.roles.length < b.roles.length) return -1;
            if(a.roles.length > b.roles.length) return 1;
            if(a.permission < b.permission) return -1;
            if(a.permission > b.permission) return 1;
            return 0;
        });
        
        let messages = util.generate_table(responses.get("LIST_PERMISSIONS").format({author: message.author.id}), columns, data, {permission: 20, roles: 15});
        this.bot.respond_queue(message, messages);
    }
    
    handle_show_ignorelist(message, args)
    {
        let response = "``` ";
        
        for(let i = 0;i<message.server.ignorelist.length;i++)
        {
            if(i !== 0)
                response += "\r\n";
                
            response += users.get_user_by_id(message.server.ignorelist[i], message.server).get_name_detailed(message.server);
        }
        
        response += "```";
        
        if(message.server.ignorelist.length === 0)
            this.bot.respond(message, responses.get("IGNORE_LIST_EMPTY").format({author: message.author.id}));
        else
            this.bot.respond(message, responses.get("SHOW_IGNORELIST").format({author: message.author.id, list: response}));
    }

    handle_help_me(message, args)
    {
        let response = "";

        if(args.please)
            response = responses.get("PLEASE_HELP_TOP").format({author: message.author.id});
        else
            response = responses.get("HELP_TOP").format({author: message.author.id});

        let message_queue = [];
        let role = message.user.get_role(message.server);
        let modules = "";
        for(let key in this.bot.modules)
        {
            let module = this.bot.modules[key];
            let enabled = (message.server === null) ? false : message.server.is_module_enabled(module.name);
            
            if(enabled)
            {
                if(modules.length !== 0)
                    modules += ", ";

                modules += key;
            }

            let hasNonHidden = false;
            let tmp = "";
            for(let i = 0;i<module.commands.length;i++)
            {
                if(module.commands[i].permission !== null && !permissions.is_allowed(module.commands[i].permission, role, message.server))
                    continue;
                    
                if(module.commands[i].hide_in_help === undefined || module.commands[i].hide_in_help === false)
                {
                    let is_private = module.commands[i].private !== undefined && module.commands[i].private === true;
                    
                    if(message.server !== null && is_private)
                        continue;
                        
                    if(module.commands[i].global === false && !enabled)
                        continue;

                    hasNonHidden = true;

                    tmp += "**" + config.identifiers[0] + module.commands[i].sample + "** - " + module.commands[i].description;
                    tmp += "\r\n";
                }
            }

            if(!hasNonHidden)
                continue;

            if(response.length + tmp.length >= 1900)
            {
                message_queue.push(response);
                response = "";
            }
            
            response += "**" + key + "**:\r\n";
            response += tmp;
            response += "\r\n";
        }

        let add = "";
        if(message.server !== null)
            add += "**Enabled modules**: " + modules + "\r\n\r\n";

        if(args.please)
            add += responses.get("PLEASE_HELP_BOTTOM").format({author: message.author.id});
        else
            add += responses.get("HELP_BOTTOM").format({author: message.author.id});

        if(response.length + add.length >= 1900)
        {
            message_queue.push(response);
            message_queue.push(add);
        }
        else
        {
            message_queue.push(response + add);
        }
        
        this.bot.respond_queue(message, message_queue).catch(err => {
            console.log("err", err);
        });
    }

    handle_tsundere(message, args)
    {
        if(args.on)
        {
            if(responses.currentMode)
                return this.bot.respond(message, responses.get("ALREADY_IN_MODE").format({author: message.author.id}));

            responses.setMode(true);
            this.bot.respond(message, responses.get("SWITCHED").format({author: message.author.id}));
        }
        else
        {
            if(!responses.currentMode)
                return this.bot.respond(message, responses.get("ALREADY_IN_MODE").format({author: message.author.id}));

            responses.setMode(false);
            this.bot.respond(message, responses.get("SWITCHED").format({author: message.author.id}));
        }
    }

    handle_my_role(message, args)
    {
        let role = message.user.get_role(message.server);
        if(role === "superadmin")
            role = "Superadmin";
        else if(role === "admin")
            role = "Admin";
        else if(role === "moderator")
            role = "Moderator";
        else
            role = "Normal";
            
        this.bot.respond(message, responses.get("MY_ROLE").format({author: message.author.id, role: role}));
    }
    
    handle_my_permissions(message, args)
    {
        let server = message.server;
        let role = permissions.get_role(message.user.get_role(server));
        let list = role.get_permissions(server);
        
        let response = "```";
        
        for(let key in list)
        {
            if(key.toUpperCase() === "BLACKLIST_SERVERS" || key.toUpperCase() === "BLACKLIST_USERS")
                continue;
            
            let name = key;
            while(name.length !== 20)
                name += " ";
                
            response += "\r\n";
            response += name;
            response += list[key] ? " (allowed)" : " (not allowed)";
        }
        response += "```";
        
        this.bot.respond(message, responses.get("MY_PERMISSIONS").format({author: message.author.id, permissions: response}));
    }
    
    on_setup()
    {
        this.bot.set_status("Online", "osu!");
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

module.exports = new CoreModule();
