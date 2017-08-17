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
    formats: CommandProcessor;
    execute: (message: MessageInterface, args: { [key: string]: any }) => void;

    permission?: string | Array<string>;
    sample?: string | Array<string>;
    description?: string;
    defaults?: { [key: string]: any };

    global?: boolean;
    private?: boolean;
    hideInHelp?: boolean;
}

export enum CommandOptions {
    None = 0,
    HideInHelp = 1,
    Global = 2
}

export enum ModuleOptions {
    None = 0,
    AlwaysOn = 1,
    DefaultOn = 2,
    Hidden = 4
}

interface CommandPropertyDescriptor {
    value?: (message: MessageInterface, args: { [key: string]: any }) => void;
}

export function Command(format: string | Array<string | { [key: string]: any }>, options: CommandOptions = CommandOptions.None) {
    return function (target: ModuleBase, propertyKey: string, descriptor: CommandPropertyDescriptor) {
        let command: CommandInterface = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                formats: new CommandProcessor(null),
                execute: descriptor.value
            };
        }

        command.formats.addFormat(format);

        if (options & CommandOptions.HideInHelp)
            command.hideInHelp = true;

        if (options & CommandOptions.Global)
            command.global = true;

        target.setCommandInternal(propertyKey, command);
    };
}

export function CommandDescription(description: string) {
    return function (target: ModuleBase, propertyKey: string, descriptor: CommandPropertyDescriptor) {
        let command: CommandInterface = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                formats: new CommandProcessor(null),
                execute: descriptor.value
            };
        }

        command.description = description;
        target.setCommandInternal(propertyKey, command);
    };
}

export function CommandSample(samples: string | Array<string>) {
    return function (target: ModuleBase, propertyKey: string, descriptor: CommandPropertyDescriptor) {
        let command: CommandInterface = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                formats: new CommandProcessor(null),
                execute: descriptor.value
            };
        }

        command.sample = samples;
        target.setCommandInternal(propertyKey, command);
    };
}

export function CommandPermission(permissions: string | Array<string>) {
    return function (target: ModuleBase, propertyKey: string, descriptor: CommandPropertyDescriptor) {
        let command: CommandInterface = target.getCommandInternal(propertyKey);
        if (!command) {
            command = {
                formats: new CommandProcessor(null),
                execute: descriptor.value
            };
        }

        command.permission = permissions;
        target.setCommandInternal(propertyKey, command);
    };
}

export function Module(name: string, description: string, options: ModuleOptions = ModuleOptions.None) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        let alwaysOn = options & ModuleOptions.AlwaysOn ? true : false;
        let defaultOn = options & ModuleOptions.DefaultOn ? true : false;
        let hidden = options & ModuleOptions.Hidden ? true : false;

        return class extends constructor {
            _name = name;
            _description = description;
            _alwaysOn = alwaysOn;
            _defaultOn = defaultOn;
            _hidden = hidden;
        }
    }
}

export class ModuleBase {
    public _bot: BotBase;
    
    protected _name: string;
    protected _description: string | Array<string>;
    protected _commands: { [key: string]: CommandInterface };
    protected _permissions: Permissions;
    
    protected _alwaysOn: boolean = false;
    protected _defaultOn: boolean = false;
    protected _disabled: boolean = false;
    protected _hidden: boolean = false;

    constructor() {
        this._name = "";
        this._bot = null;
        this._permissions = new Permissions();

        if (!this._commands)
            this._commands = {};
    }

    getCommandInternal(key: string): CommandInterface {
        if (!this._commands)
            this._commands = {};

        return this._commands[key];
    }

    setCommandInternal(key: string, command: CommandInterface): void {
        if (!this._commands)
            this._commands = {};

        this._commands[key] = command;
    }

    public async checkMessage(server: Server, message: MessageInterface): Promise<boolean> {
        let best = null;
        for (let key in this._commands) {
            let command = this._commands[key];
            let data = null;
            let is_private = command.private !== undefined && command.private === true;

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

            let processor = command.formats;
            let args = processor.process(message.content);
            if (args === null)
                continue;

            if (typeof command.defaults !== "undefined") {
                for (let key in command.defaults) {
                    args[key] = args[key] || command.defaults[key];
                }
            }

            data = [message, args];

            if (command.permission !== null && !this._permissions.isAllowed(command.permission as string, message.user.getRole(message.server), message.server)) {
                this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id, permission: command.permission }));
                return true;
            }

            await command.execute.apply(this, data);
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

    get commands(): { [key: string]: CommandInterface } {
        return this._commands;
    }

    get alwaysOn(): boolean {
        return this._alwaysOn;
    }

    get defaultOn(): boolean {
        return this._defaultOn;
    }

    get hidden(): boolean {
        return this._hidden;
    }

    onSetup(): void { }
    onLoad(server: Server): void { }
    onUnload(server: Server): void { }
    onShutdown(): void { }
}
