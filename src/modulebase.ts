import { Permissions } from "./permissions";
import { Responses } from "./responses";
import { BotBase } from "./botbase";
import { StringFormat } from "./util";
import { CommandProcessor } from "./command";
import { Server } from "./server";
import { User } from "./users";
import * as Discord from "discord.js";

export interface MessageInterface {
    server: Server;
    author: Discord.User;
    channel: Discord.TextChannel;

    content: string;
    user: User;
}

export interface CommandInterface {
    formats: Array<Array<any>|string>;
    permission: string;
    execute: (message: MessageInterface, args: { [key: string]: any }) => void;

    sample?: string;
    description?: string;
    defaults?: { [key: string]: any };

    global?: boolean;
    private?: boolean;
    hideInHelp?: boolean;
}

export class ModuleBase {
    public _bot: BotBase;
    
    protected _name: string;
    protected _description: string;
    protected _commands: Array<CommandInterface>;
    protected _permissions: Permissions;
    
    protected _alwaysOn: boolean = false;
    protected _defaultOn: boolean = false;
    protected _disabled: boolean = false;
    protected _hidden: boolean = false;

    constructor() {
        this._name = "";
        this._commands = [];
        this._bot = null;
        this._permissions = new Permissions();
    }

    add_command(command: CommandInterface) {
        command.execute = command.execute.bind(this);
        this._commands.push(command);
    }

    check_message(server: Server, message: MessageInterface) {
        let best = null;
        for (let i = 0; i < this._commands.length; i++) {
            let command = this._commands[i];
            let data = null;
            let is_private = this._commands[i].private !== undefined && this._commands[i].private === true;

            if (server !== null && !command.global) {
                if (!this._alwaysOn && !server.isModuleEnabled(this._name)) {
                    //module is not enabled for this server and this is a local command
                    continue;
                }
            } else if (server !== null && is_private) {
                continue;
            } else if (server === null && !command.global) {
                //only global commands are allowed in private channels
                continue;
            }

            let processor = new CommandProcessor(this._bot);
            for (let format of command.formats)
                processor.add_format(format);

            let args = processor.process(message.content);
            if (args === null)
                continue;

            if (typeof command.defaults !== "undefined") {
                for (let key in command.defaults) {
                    args[key] = args[key] || command.defaults[key];
                }
            }

            data = [message, args];

            if (command.permission !== null && !this._permissions.isAllowed(command.permission, message.user.getRole(message.server), message.server)) {
                this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id, permission: command.permission }));
                return true;
            }

            command.execute.apply(null, data);
            return true;
        }

        return false;
    }

    get name(): string {
        return this._name;
    }
    
    get disabled(): boolean {
        return this._disabled;
    }

    get commands(): Array<CommandInterface> {
        return this._commands;
    }

    get alwaysOn(): boolean {
        return this._alwaysOn;
    }

    get defaultOn(): boolean {
        return this._defaultOn;
    }

    onSetup() { }
    onLoad(server: Server) { }
    onUnload(server: Server) { }
    onShutdown() { }
}
