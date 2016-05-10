"use strict";
const permissions = require("./permissions.js");
const responses = require("./responses.js");

class IModule
{
    constructor()
    {
        this.name = "";
        this.always_on = false;
        this.commands = [];
    }

    add_command(command)
    {
        command.execute = command.execute.bind(this);
        this.commands.push(command);
    }

    check_message(server, message, split)
    {
        for(var i = 0;i<this.commands.length;i++)
        {
            var command = this.commands[i];
            var data = null;

            if(server != null && !command.global)
            {
                if(!server.is_module_enabled(this.name))
                {
                    //module is not enabled for this server and this is a local command
                    continue;
                }
            }
            else if(server == null && !command.global)
            {
                //only global commands are allowed in private channels
                continue;
            }

            if(command.regex !== null)
            {
                if(Array.isArray(command.regex))
                {
                    for(var j = 0;j<command.regex.length;j++)
                    {
                        data = command.regex[j].exec(message.content);
                        if(data === null)
                            continue;

                        data.splice(0, 1);
                        data = [message].concat(data);
                        message.index = j;

                        break;
                    }

                    if(data === null)
                        continue;
                }
                else
                {
                    data = command.regex.exec(message.content);
                    if(data === null)
                        continue;

                    data.splice(0, 1);
                    data = [message].concat(data);
                    message.index = 0;
                }
            }
            else if(split.length > 1)
            {
                break;
            }
            else if(message.content.charAt(0) != "-")
            {
                data = [message];
            }
            else
            {
                continue;
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

module.exports = IModule;
