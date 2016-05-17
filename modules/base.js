"use strict";

const responses = require("../src/responses.js");
const permissions = require("../src/permissions.js");
const IModule = require("../src/IModule.js");
const ServerData = require("../src/ServerData.js");
const users = require("../src/users.js");
var moment = require('moment-timezone');

class BaseModule extends IModule
{
    constructor()
    {
        super();

        this.name = "General";
		this.description = "This is the base module! Cannot be disabled."
        this.always_on = true;

        permissions.register("CHANGE_PERSONALITY", "moderator");

        this.add_command({
            match: function(message){
                var please = false;
                
                if(message.content.startsWith("please help me"))
                {
                    please = true;
                }
                else if(!message.content.startsWith("help me"))
                {
                    return null;
                }
                
                return [please];
            },
            hide_in_help: true,
            permission: null,
            global: true,

            execute: this.handle_help_me
        });

        this.add_command({
            match: function(message){
                var on = false;
                
                if(message.content.startsWith("tsundere on"))
                {
                    on = true;
                }
                else if(!message.content.startsWith("tsundere off"))
                {
                    return null;
                }
                
                return [on];
            },
            hide_in_help: true,
            permission: "CHANGE_PERSONALITY",
            global: false,

            execute: this.handle_tsundere
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("what is my role"))
                    return null;
                    
                return [];
            },
            sample: "sempai what is my role?",
            description: "Displays your role.",
            permission: null,
            global: false,
            
            execute: this.handle_my_role
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("what are my permissions"))
                    return null;
                    
                return [];
            },
            sample: "sempai what are my permissions?",
            description: "Displays your role's permissions.",
            permission: null,
            global: false,
            
            execute: this.handle_my_permissions
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("list roles"))
                    return null;
                    
                return [];
            },
            sample: "sempai list roles",
            description: "Lists every user's role.",
            permission: null,
            global: false,
            
            execute: this.handle_list_roles
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("list permissions"))
                    return null;
                    
                return [];
            },
            sample: "sempai list permissions",
            description: "Lists the available permissions for each role.",
            permission: null,
            global: false,
            
            execute: this.handle_list_permissions
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("show ignorelist"))
                    return null;
                    
                return [];
            },
            sample: "sempai show ignorelist",
            description: "Shows the list of people I'm currently ignoring!",
            permission: null,
            global: false,
            
            execute: this.handle_show_ignorelist
        });
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("list timezones"))
                    return null;
                    
                var area = message.content.substr("list timezones".length + 1);
                if(area.length === 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [area.toLowerCase()];
            },
            sample: "sempai list timezones __*area*__",
            description: "Lists all the timezones",
            permission: null,
            global: false,
            
            execute: this.handle_list_timezones
        });
    }

    game_switcher()
    {
        var games = [
            "Boku no Pico",
            "Petting Zoo Simulator",
            "Hello Kitty Online",
            "Counter-Strike: Global Offensive",
			"osu!"
        ];

        var game = games[Math.floor((Math.random() * games.length))];

        var _this = this;

        _this.bot.set_status("Online", game);
        var interval = setInterval(function() {
            var game = games[Math.floor((Math.random() * games.length))];

            _this.bot.set_status("Online", game);
        }, 50000);
    }

    print_users(role, server)
    {
        var ret = "\r\n" + role + ":";
        var tmp = permissions.get_role(role).get_permissions(server);
        var admin_permissions = permissions.get_role("admin").get_permissions(server);
        
        for(var i = 0;i<server.server.members.length;i++)
        {
            var user = users.get_user_by_id(server.server.members[i].id, server);
            if(server.server.members[i].id === this.bot.user.user_id)
                continue;
                
            if(user.get_role(server) !== role)
                continue;
                
            var name = user.get_name_detailed(server);
            while(name.length != 30)
                name += " ";
                
            ret += "\r\n   " + name;
        }
        
        return ret;
    }

    handle_list_roles(message)
    {
        var response = "```";
        
        response += this.print_users("admin", message.server);
        response += "\r\n";
        response += this.print_users("moderator", message.server);
        response += "\r\n";
        response += this.print_users("normal", message.server);
        
        response += "```";
        
        this.bot.respond(message, responses.get("LIST_ROLES").format({author: message.author.id, roles: response}));
    }
    
    print(role, server)
    {
        var ret = "\r\n" + role + ":";
        var tmp = permissions.get_role(role).get_permissions(server);
        var admin_permissions = permissions.get_role("admin").get_permissions(server);
        
        for(var key in tmp)
        {
            var name = key;
            while(name.length != 20)
                name += " ";
            
            if(!tmp[key] && !admin_permissions[key])
                continue;
                
            ret += "\r\n   " + name;
            if(tmp[key])
                ret += " (allowed)";
            else
                ret += " (not allowed)";
        }
        
        return ret;
    }
    
    handle_list_permissions(message)
    {
        var response = "```";
        
        response += this.print("admin", message.server);
        response += "\r\n";
        response += this.print("moderator", message.server);
        response += "\r\n";
        response += this.print("normal", message.server);
        
        response += "```";
        
        this.bot.respond(message, responses.get("LIST_PERMISSIONS").format({author: message.author.id, permissions: response}));
    }
    
    handle_show_ignorelist(message)
    {
        var response = "``` ";
        
        for(var i = 0;i<message.server.ignorelist.length;i++)
        {
            if(i != 0)
                response += "\r\n";
                
            response += users.get_user_by_id(message.server.ignorelist[i], message.server).get_name_detailed(message.server);
        }
        
        response += "```";
        
        if(message.server.ignorelist.length === 0)
            this.bot.respond(message, responses.get("IGNORE_LIST_EMPTY").format({author: message.author.id}));
        else
            this.bot.respond(message, responses.get("SHOW_IGNORELIST").format({author: message.author.id, list: response}));
    }

    handle_help_me(message, please)
    {
        var response = "";

        if(please)
            response = responses.get("PLEASE_HELP_TOP").format({author: message.author.id});
        else
            response = responses.get("HELP_TOP").format({author: message.author.id});

        var message_queue = [];
        var role = message.user.get_role(message.server);
        var modules = "";
        for(var key in this.bot.modules)
        {
            var module = this.bot.modules[key];
            var enabled = (message.server === null) ? false : message.server.is_module_enabled(module.name);
            
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
                if(module.commands[i].permission != null && !permissions.is_allowed(module.commands[i].permission, role, message.server))
                    continue;
                    
                if(module.commands[i].hide_in_help === undefined || module.commands[i].hide_in_help === false)
                {
                    var is_private = module.commands[i].private !== undefined && module.commands[i].private === true;
                    
                    if(message.server !== null && is_private)
                        continue;
                        
                    if(module.commands[i].global == false && !enabled)
                        continue;

                    hasNonHidden = true;

                    tmp += "**" + module.commands[i].sample + "** - " + module.commands[i].description;
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

        var add = "";
        if(message.server !== null)
            add += "**Enabled modules**: " + modules + "\r\n\r\n";

        if(please)
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
        
        var send = function(queue, message, index, send)
        {
            if(index >= queue.length)
                return;
                
            this.bot.respond(message, queue[index]).then(function(queue, message, index, send){
                return send(index + 1, send);
            }.bind(this, queue, message, index, send)).catch(function(err){
                console.log(err);
            });
        }.bind(this, message_queue, message);
        send(0, send);
    }

    handle_tsundere(message, on)
    {
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

    handle_my_role(message)
    {
        var role = message.user.get_role(message.server);
        if(role == "superadmin")
            role = "Superadmin";
        else if(role == "admin")
            role = "Admin";
        else if(role == "moderator")
            role = "Moderator";
        else
            role = "Normal";
            
        this.bot.respond(message, responses.get("MY_ROLE").format({author: message.author.id, role: role}));
    }
    
    handle_my_permissions(message)
    {
        var server = message.server;
        var role = permissions.get_role(message.user.get_role(server));
        var list = role.get_permissions(server);
        
        var response = "```";
        
        for(var key in list)
        {
            var name = key;
            while(name.length != 20)
                name += " ";
                
            response += "\r\n";
            response += name;
            response += list[key] ? " (allowed)" : " (not allowed)";
        }
        response += "```";
        
        this.bot.respond(message, responses.get("MY_PERMISSIONS").format({author: message.author.id, permissions: response}));
    }
    
    handle_list_timezones(message, area)
    {
        var timezones = moment.tz.names();
        for(var i = timezones.length - 1;i>=0;i--)
        {
            var t = timezones[i];
            if(!t.toLowerCase().startsWith(area))
            {
                timezones.splice(i, 1);
            }
        }
        
        var tmp = [];
        var num = 0;
        var response = "```";
        var name = "Name";
        var abbr = "Abbreviation";
        
        while(name.length < 26)
            name += " ";
            
        while(abbr.length < 10)
            abbr += " ";
            
        response += name + abbr + "\r\n";
        for(var i = 0;i<timezones.length;i++)
        {
            var zone = moment.tz.zone(timezones[i]);
            var name = zone.name;
            var abbr = zone.abbrs[0];
            
            while(name.length < 26)
                name += " ";
                
            while(abbr.length < 10)
                abbr += " ";
                
            num++;
            response += name + abbr + "\r\n";
            
            if(response.length >= 1800)
            {
                response += "```";
                tmp.push(response);
                
                response = "```";
                var name = "Name";
                var abbr = "Abbreviation";
                
                while(name.length < 26)
                    name += " ";
                    
                while(abbr.length < 10)
                    abbr += " ";
                    
                response += name + abbr + "\r\n";
                num = 0;
            }
        }
        
        if(num != 0)
        {
            response += "```";
            tmp.push(response);
        }
        
        tmp[0] = responses.get("TIMEZONE_LIST").format({author: message.author.id, timezones: tmp[0]});
        var send = function(message, tmp, index){
            if(index == tmp.length)
                return;
                
            this.bot.respond(message, tmp[index]).then(function(){
                send(index + 1);
            });
        }.bind(this, message, tmp);
        
        send(0);
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
