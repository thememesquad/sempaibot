import { RichEmbed, RichEmbedOptions } from "discord.js";
import { IMessageInterface } from "./module/messageinterface";
import { ModuleBase } from "./module/modulebase";
import { Server } from "./server";
import { User } from "./user/user";

export type MessageContent = string | RichEmbed | RichEmbedOptions;
export abstract class BotBase {
    public abstract log(...args: any[]): void;
    public abstract error(...args: any[]): void;
    public abstract write(...args: any[]): void;

    public abstract isUserBlacklisted(user: User): boolean;
    public abstract isServerBlacklisted(server: string): boolean;
    public abstract getModule(name: string): ModuleBase;

    public abstract message(message: MessageContent | MessageContent[], server: Server): Promise<IMessageInterface | IMessageInterface[]>;
    public abstract respond(m: IMessageInterface, message: MessageContent | MessageContent[]): Promise<IMessageInterface | IMessageInterface[]>;
    public abstract edit(original: IMessageInterface, edit: string | RichEmbed | RichEmbedOptions): Promise<IMessageInterface>;

    public abstract onReady(): void;
    public abstract onMessage(message: IMessageInterface): void;
    public abstract onServerCreated(server: Server): void;
    public abstract onServerDeleted(server: Server): void;

    public abstract blacklistServer(serverId: string): void;
    public abstract blacklistUser(user: User): void;

    public abstract whitelistServer(serverId: string): void;
    public abstract whitelistUser(user: User): void;

    public abstract get user(): User;
    public abstract get modules(): { [key: string]: ModuleBase };
    public abstract get servers(): { [key: string]: Server };
}
