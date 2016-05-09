"use strict";

const responses = require("../src/responses.js");
const permissions = require("../src/permissions.js");
const IModule = require("../src/IModule.js");

class BaseModule extends IModule
{
    constructor()
    {
        super();

        this.name = "General";
        this.always_on = true;

        permissions.register("CHANGE_PERSONALITY", "moderator");

        this.add_command({
            regex: /join server (.*)/i,
            sample: "sempai join server __*invite*__",
            description: "Allow sempai to join a new server",
            permission: null,
            global: true,

            execute: this.handle_join_server
        });

        this.add_command({
            regex: [
                /help me/i,
                /please help me/i
            ],
            hide_in_help: true,
            permission: null,
            global: true,

            execute: this.handle_help_me
        });

        this.add_command({
            regex: [
                /tsundere on/i,
                /tsundere off/i,
            ],
            hide_in_help: true,
            permission: "CHANGE_PERSONALITY",
            global: false,

            execute: this.handle_tsundere
        });
    }

    game_switcher()
    {
        var games = [
            "Boku no Pico",
            "Petting Zoo Simulator",
            "Hello Kitty Online",
            "Counter-Strike: Global Offensive"
        ];

        var game = games[Math.floor((Math.random() * games.length))];

        var _this = this;

        _this.bot.discord.setStatus("Online", game);
        var interval = setInterval(function() {
            var game = games[Math.floor((Math.random() * games.length))];

            _this.bot.discord.setStatus("Online", game);
        }, 50000);
    }

    handle_join_server(message, invite)
    {
        var _this = this;
        _this.bot.discord.getInvite(invite, function(error, inv) {
            if (error !== null)
            {
                _this.bot.respond(message, response.get("JOIN_INVALID_INVITE").format({author: message.author.id, invite: inv.server.name}));
                return;
            }

            var servers = _this.bot.discord.servers;
            var success = true;
            for(var i = 0; i < servers.length; i++)
            {
                if (servers[i].id === inv.server.id)
                {
                    success = false;
                    break;
                }
            }

            if (!success)
            {
                _this.bot.respond(message, response.get("JOIN_ALREADY").format({author: message.author.id, invite: inv.server.name}));
                return;
            }

            _this.bot.discord.joinServer(invite, function(error, server) {
                if (error !== null)
                {
                    _this.bot.respond(message, response.get("JOIN_FAILED").format({author: message.author.id, invite: inv.server.name}));
                    return;
                }

                _this.bot.respond(message, response.get("JOIN_SUCCESS").format({author: message.author.id, invite: server.name}));
            });
        });
    }

    handle_help_me(message)
    {
        var please = message.index == 1;
        var response = "";

        if(please)
            response = responses.get("PLEASE_HELP_TOP").format({author: message.author.id});
        else
            response = responses.get("HELP_TOP").format({author: message.author.id});

        var modules = "";
        for(var key in this.bot.modules)
        {
            var module = this.bot.modules[key];
            var enabled = message.server.is_module_enabled(module.name);

            if(enabled)
            {
                if(modules.length !== 0)
                    modules += ", ";

                modules += key;
            }

            var hasNonHidden = false;
            var tmp = "";
            for(var i = 0;i<module.commands.length;i++)
            {
                if(module.commands[i].hide_in_help === undefined || module.commands[i].hide_in_help === false)
                {
                    if(module.commands[i].global == false && !enabled)
                        continue;

                    hasNonHidden = true;

                    tmp += "**" + module.commands[i].sample + "** - " + module.commands[i].description;
                    tmp += "\r\n";
                }
            }

            if(!hasNonHidden)
                continue;

            response += "**" + key + "**:\r\n";
            response += tmp;
            response += "\r\n";
        }

        response += "**Enabled modules**: " + modules + "\r\n\r\n";

        if(please)
            response += responses.get("PLEASE_HELP_BOTTOM").format({author: message.author.id});
        else
            response += responses.get("HELP_BOTTOM").format({author: message.author.id});

        this.bot.respond(message, response);
    }

    handle_tsundere(message)
    {
        var on = message.index == 0;

        if(on)
        {
            if(responses.currentMode)
                return this.bot.respond(message, responses.get("ALREADY_IN_MODE").format({author: message.author.id}));

            responses.setMode(true);
            this.bot.respond(message, responses.get("SWITCHED").format({author: message.author.id}));
        }else{
            if(!responses.currentMode)
                return this.bot.respond(message, responses.get("ALREADY_IN_MODE").format({author: message.author.id}));

            responses.setMode(false);
            this.bot.respond(message, responses.get("SWITCHED").format({author: message.author.id}));
        }
    }

    on_setup(bot)
    {
        this.bot = bot;
        this.game_switcher();
    }

    on_load(server)
    {
    }

    on_unload(server)
    {
    }
}

module.exports = new BaseModule();
