import { ICommand } from "./command";
import { Bot } from "./bot";
import { DBServer } from "./models/dbserver";
import { IMessage } from "./imessage";
import { AccessManager, TemplateManager, DatabaseManager } from "./managers";
import { inject } from "inversify";
import { DiscordAPI } from "../api/discord";
import { TemplateMessageID } from "./itemplatemessageid";
import { RoleType } from "./roletype";

export abstract class IModule {
    public _bot!: Bot;

    protected _name: string;
    protected _description!: string | string[];
    protected _commands!: ICommand[];

    protected _alwaysOn: boolean = false;
    protected _defaultOn: boolean = false;
    protected _disabled: boolean = false;
    protected _hidden: boolean = false;

    @inject(AccessManager)
    protected _accessManager!: AccessManager;

    @inject(DatabaseManager)
    protected _databaseManager!: DatabaseManager;

    constructor()
    {
        const rights: { name: string, defaultRole: RoleType }[] = (this.constructor as any).rights || [];

        for (const right of rights) {
            Bot.instance.get(AccessManager).register(right.name, right.defaultRole);
        }

        this._name = "";

        if (this._commands == null) {
            this._commands = [];
        }
    }

    public getCommandInternal(key: string): ICommand | null
    {
        if (this._commands == null) {
            this._commands = [];
        }

        return this._commands.find((value, index, obj) => {
            return value.key === key;
        }) || null;
    }

    public setCommandInternal(key: string, command: ICommand): void
    {
        if (this._commands == null) {
            this._commands = [];
        }

        command.key = key;

        for (const i in this._commands) {
            if (this._commands[i].key === key) {
                this._commands[i] = command;
                return;
            }
        }

        this._commands.push(command);
    }

    public async checkMessage(message: IMessage): Promise<boolean>
    {
        for (const command of this._commands) {
            let data = null;
            const isPrivate = command.private !== undefined && command.private === true;

            if (message.server !== null && !command.global) {
                if (!this._alwaysOn && !message.server.isModuleEnabled(this._name)) {
                    // module is not enabled for this server and this is a local command
                    continue;
                }
            } else if (message.server !== null && isPrivate) {
                continue;
            } else if (message.server === null && !command.global) {
                // only global commands are allowed in private channels
                continue;
            }

            const processor = command.formats;
            const args = processor.process(message.content);

            if (args === null) {
                continue;
            }

            if (typeof command.defaults !== "undefined") {
                for (const key in command.defaults) {
                    args[key] = args[key] || command.defaults[key];
                }
            }

            data = [message, args];

            if (command.permission !== null && !this._accessManager.isAllowed(command.permission as string, message.user.getRole(message.server), message.server)) {
                Bot.instance.get(DiscordAPI).respond(message, Bot.instance.get(TemplateManager).get(TemplateMessageID.PermissionDenied, {
                    author: message.author.id,
                    permission: command.permission
                }));

                return true;
            }

            if (!command.execute) {
                return true;
            }

            if (Object.keys(command.mapping).length > 2 || command.mapping["args"] === undefined) {
                let newData = [];

                for (let key in command.mapping) {
                    if (command.mapping[key][0] === 0) {
                        newData[0] = message;
                    } else if (args[key] !== undefined) {
                        newData[command.mapping[key][0]] = args[key];
                    }
                }

                await command.execute.apply(this, newData as any);
            } else {
                await command.execute.apply(this, data as any);
            }

            return true;
        }

        return false;
    }

    public get name(): string {
        return this._name;
    }

    public get disabled(): boolean {
        return this._disabled;
    }

    public get commands(): ICommand[] {
        return this._commands;
    }

    public get alwaysOn(): boolean {
        return this._alwaysOn;
    }

    public get defaultOn(): boolean {
        return this._defaultOn;
    }

    public get hidden(): boolean {
        return this._hidden;
    }

    public onSetup(): void {
        // empty
    }

    public onLoad(server: DBServer): void {
        // empty
    }

    public onUnload(server: DBServer): void {
        // empty
    }

    public onShutdown(): void {
        // empty
    }
}
