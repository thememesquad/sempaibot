import { Message } from "discord.js";
import { BotBase, MessageContent } from "../botbase";
import { ReactionId, User } from "../index";
import { IMessage } from "../module/messageinterface";
import { Server } from "../server";

export abstract class IAPI {
    public abstract setBot(bot: BotBase): void;

    public abstract async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessage | IMessage[]>;
    public abstract async respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]>;
    public abstract async edit(original: IMessage, message: MessageContent): Promise<IMessage>;

    public abstract async addReaction(message: IMessage, reaction: ReactionId | ReactionId[] | string | string[]): Promise<IMessage>;
    public abstract async removeReaction(message: IMessage, reaction: ReactionId | string, user?: User): Promise<IMessage>;
    public abstract async clearReactions(message: IMessage): Promise<IMessage>;

    public abstract async startup(): Promise<void>;
    public abstract async shutdown(): Promise<void>;
    public abstract async processServers(): Promise<Server[]>;

    public abstract async startTyping(message: IMessage): Promise<void>;
    public abstract async stopTyping(message: IMessage): Promise<void>;

    public abstract getUserId(): string;
}
