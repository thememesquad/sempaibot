"use strict";

const IModule = require("../src/IModule.js");
const permissions = require("../src/permissions.js");

class AdminModule extends IModule
{
    constructor()
    {
        super();

        this.name = "Admin";
        this.always_on = true;

        permissions.register("RESTRICT_MODULES", "superadmin");
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
            regex: /restrict module (.*)/i,
            sample: "sempai restrict module __*module*__",
            description: "Restricts a module to this server.",
            permission: "RESTRICT_MODULES",
            global: false,

            execute: this.handle_restrict_module
        });

        this.add_command({
            regex: /allow module (.*)/i,
            sample: "sempai allow module __*module*__",
            description: "Allows a module on this server.",
            permission: "RESTRICT_MODULES",
            global: false,

            execute: this.handle_allow_module
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
            //TODO: send "module doesn't exist" response
            return;
        }

        if(message.server.is_module_enabled(name))
        {
            //TODO: send "module already enabled" response
            return;
        }

        message.server.enable_module(name);
        //TODO: send "module enabled" response
    }

    handle_disable_module(message, name)
    {
        var module = this.bot.get_module(name);
        if(module === null)
        {
            //TODO: send "module doesn't exist" response
            return;
        }

        if(!message.server.is_module_enabled(name))
        {
            //TODO: send "module not enabled" response
            return;
        }

        if(module.always_on)
        {
            //TODO: send "module can't be disabled" response
            return;
        }

        message.server.disable_module(name);
        //TODO: send "module disabled" response
    }

    handle_restrict_module(message, name)
    {
    }

    handle_allow_module(message, name)
    {
    }
    
    handle_list_modules(message)
    {
        //TODO
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
