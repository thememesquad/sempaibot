"use strict";
const permissions = require("./permissions.js");
const responses = require("./responses.js");
const CommandProcessor = require("./command.js");

class ModuleBase
{
    constructor()
    {
        this.name = "";
        this.always_on = false;
        this.commands = [];
        this.bot = null;
    }

    add_command(command)
    {
        command.execute = command.execute.bind(this);
        this.commands.push(command);
    }

    check_message(server, message)
    {
        let best = null;
        for(let i = 0;i<this.commands.length;i++)
        {
            let command = this.commands[i];
            let data = null;
            let is_private = this.commands[i].private !== undefined && this.commands[i].private === true;
            
            if(server !== null && !command.global)
            {
                if(!this.always_on && !server.is_module_enabled(this.name))
                {
                    //module is not enabled for this server and this is a local command
                    continue;
                }
            }
            else if(server !== null && is_private)
            {
                continue;
            }
            else if(server === null && !command.global)
            {
                //only global commands are allowed in private channels
                continue;
            }

            if(typeof command.formats !== "undefined") {
                let processor = new CommandProcessor(this.bot);
                for(let format of command.formats)
                    processor.add_format(format);
                
                let args = processor.process(message.content);
                if(args === null)
                    continue;
                
                if(typeof command.defaults !== "undefined") {
                    for(let key in command.defaults) {
                        args[key] = args[key] || command.defaults[key];
                    }
                }

                data = [message, args];
            } else {
                let ret = command.match(message);
                if(ret === null)
                    continue;
                
                data = [message].concat(ret);
            }
            
            if(command.permission !== null && !permissions.is_allowed(command.permission, message.user.get_role(message.server), message.server))
            {
                this.bot.respond(message, responses.get("NOT_ALLOWED").format({author: message.author.id, permission: command.permission}));
                return true;
            }
            
            command.execute.apply(null, data);
            return true;
        }

        return false;
    }
}

module.exports = ModuleBase;
