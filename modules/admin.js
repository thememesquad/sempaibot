"use strict";

const IModule = require("../src/IModule.js");
const permissions = require("../src/permissions.js");
const responses = require("../src/responses.js");

class AdminModule extends IModule
{
    constructor()
    {
        super();

        this.name = "Admin";
        this.always_on = true;

        permissions.register("BLACKLIST_SERVERS", "superadmin");
        permissions.register("BLACKLIST_USERS", "superadmin");
        permissions.register("IGNORE_USERS", "admin");
        permissions.register("MANAGE_MODULES", "admin");
        permissions.register("MANAGE_PERMISSIONS", "admin");
        permissions.register("ASSIGN_ROLES", "admin");

        this.add_command({
            regex: /enable module (.*)/i,
            sample: "sempai enable module __*module*__",
            description: "Enables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_enable_module
        });

        this.add_command({
            regex: /disable module (.*)/i,
            sample: "sempai disable module __*module*__",
            description: "Disables a module for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_disable_module
        });

        this.add_command({
            regex: /list modules/i,
            sample: "sempai list modules",
            description: "Lists all the available modules for this server.",
            permission: "MANAGE_MODULES",
            global: false,

            execute: this.handle_list_modules
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
