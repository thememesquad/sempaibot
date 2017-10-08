import { BotBase } from "../botbase";
import { ICommandInterface } from "../command/commandinterface";
import { PermissionManager } from "../permission/manager";
import { MessageID } from "../personality/messageid";
import { PersonalityManager } from "../personality/personalitymanager";
import { Server } from "../server";
import { IMessageInterface } from "./messageinterface";

export class ModuleBase {
    public _bot: BotBase;

    protected _name: string;
    protected _description: string | string[];
    protected _commands: { [key: string]: ICommandInterface };

    protected _alwaysOn: boolean = false;
    protected _defaultOn: boolean = false;
    protected _disabled: boolean = false;
    protected _hidden: boolean = false;

    constructor() {
        this._name = "";
        this._bot = null;

        if (!this._commands)
            this._commands = {};
    }

    public getCommandInternal(key: string): ICommandInterface {
        if (!this._commands)
            this._commands = {};

        return this._commands[key];
    }

    public setCommandInternal(key: string, command: ICommandInterface): void {
        if (!this._commands)
            this._commands = {};

        this._commands[key] = command;
    }

    public async checkMessage(server: Server, message: IMessageInterface): Promise<boolean> {
        const best = null;
        for (const key in this._commands) {
            const command = this._commands[key];
            let data = null;
            const isPrivate = command.private !== undefined && command.private === true;

            if (server !== null && !command.global) {
                if (!this._alwaysOn && !server.isModuleEnabled(this._name)) {
                    // module is not enabled for this server and this is a local command
                    continue;
                }
            } else if (server !== null && isPrivate) {
                continue;
            } else if (server === null && !command.global) {
                // only global commands are allowed in private channels
                continue;
            }

            const processor = command.formats;
            const args = processor.process(message.content);
            if (args === null)
                continue;

            if (typeof command.defaults !== "undefined") {
                for (const key in command.defaults) {
                    args[key] = args[key] || command.defaults[key];
                }
            }

            data = [message, args];

            if (command.permission !== null && !PermissionManager.instance.isAllowed(command.permission as string, message.user.getRole(message.server), message.server)) {
                this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, { author: message.author.id, permission: command.permission }));
                return true;
            }

            await command.execute.apply(this, data);
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

    public get commands(): { [key: string]: ICommandInterface } {
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

    public onSetup(): void {}
    public onLoad(server: Server): void {}
    public onUnload(server: Server): void {}
    public onShutdown(): void {}
}
