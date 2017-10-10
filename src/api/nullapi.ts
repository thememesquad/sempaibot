import { RichEmbed } from "discord.js";
import { BotBase, IAPI, IMessageInterface, MessageContent, Server } from "../core/index";

export class NullAPI implements IAPI {
    private _bot: BotBase;

    public setBot(bot: BotBase): void {
        this._bot = bot;
    }

    public async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessageInterface | IMessageInterface[]> {
        // empty
        const ret: IMessageInterface = {
            channel: null,
            content: null,
        };

        return ret;
    }

    public async respond(m: IMessageInterface, message: MessageContent | MessageContent[]): Promise<IMessageInterface | IMessageInterface[]> {
        // empty
        const ret: IMessageInterface = {
            channel: null,
            content: null,
        };

        return ret;
    }

    public async edit(original: IMessageInterface, message: MessageContent): Promise<IMessageInterface> {
        // empty
        const ret: IMessageInterface = {
            channel: null,
            content: null,
        };

        return ret;
    }

    public async startup(): Promise<void> {
        // empty
    }

    public async shutdown(): Promise<void> {
        // empty
    }

    public async processServers(): Promise<Server[]> {
        return [];
    }

    public getUserId(): string {
        return "";
    }
}
