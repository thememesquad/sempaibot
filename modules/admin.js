"use strict";
const IModule = require("../IModule.js");

class AdminModule extends IModule
{
    constructor()
    {
        super();

        this.name = "Admin";
        this.always_on = true;
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
