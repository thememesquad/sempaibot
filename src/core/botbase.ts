import { RichEmbed, RichEmbedOptions } from "discord.js";
import { IMessage, ModuleBase, Server, User } from "./";

export type MessageContent = string | RichEmbed | RichEmbedOptions;
export abstract class BotBase {
    public abstract log(...args: any[]): void;
    public abstract error(...args: any[]): void;
    public abstract write(...args: any[]): void;

    public abstract isUserBlacklisted(user: User): boolean;
    public abstract isServerBlacklisted(server: string): boolean;

    public abstract getServer(id: string): Server;
    public abstract getModule(name: string): ModuleBase;

    public abstract addHookable(identifier: string, object: ModuleBase, hook: string): void;
    public abstract removeHookable(identifier: string): void;

    public abstract message(message: MessageContent | MessageContent[], server: Server): Promise<IMessage | IMessage[]>;
    public abstract respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]>;
    public abstract edit(original: IMessage, edit: string | RichEmbed | RichEmbedOptions): Promise<IMessage>;

    public abstract onReady(): void;
    public abstract onMessage(message: IMessage): void;
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
