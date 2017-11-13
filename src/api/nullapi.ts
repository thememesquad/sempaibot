import { RichEmbed } from "discord.js";
import { BotBase, IAPI, IMessage, MessageContent, ReactionId, Server } from "../core";

export class NullAPI implements IAPI {
    private _bot: BotBase;

    public setBot(bot: BotBase): void {
        this._bot = bot;
    }

    public async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessage | IMessage[]> {
        // empty
        const ret: IMessage = {
            channel: null,
            content: null,
            id: ""
        };

        return ret;
    }

    public async respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]> {
        // empty
        const ret: IMessage = {
            channel: null,
            content: null,
            id: ""
        };

        return ret;
    }

    public async edit(original: IMessage, message: MessageContent): Promise<IMessage> {
        // empty
        const ret: IMessage = {
            channel: null,
            content: null,
            id: ""
        };

        return ret;
    }

    public async addReaction(message: IMessage, reaction: ReactionId | ReactionId[] | string | string[]): Promise<IMessage> {
        return message;
    }

    public async removeReaction(message: IMessage, reaction: ReactionId | string): Promise<IMessage> {
        return message;
    }

    public async clearReactions(message: IMessage): Promise<IMessage> {
        return message;
    }

    public async startup(): Promise<void> {
        // empty
    }

    public async shutdown(): Promise<void> {
        // empty
    }

    public async startTyping(message: IMessage): Promise<void> {
        // empty
    }

    public async stopTyping(message: IMessage): Promise<void> {
        // empty
    }

    public async processServers(): Promise<Server[]> {
        return [];
    }

    public getUserId(): string {
        return "";
    }
}
