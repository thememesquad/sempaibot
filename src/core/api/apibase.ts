import { Message } from "discord.js";
import { MessageContent } from "../botbase";
import { IMessageInterface } from "../module/messageinterface";
import { Server } from "../server";

export abstract class IAPI {
    public abstract async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessageInterface | IMessageInterface[]>;
    public abstract async respond(m: IMessageInterface, message: MessageContent | MessageContent[]): Promise<IMessageInterface | IMessageInterface[]>;
    public abstract async edit(original: IMessageInterface, message: MessageContent): Promise<IMessageInterface>;

    public abstract async startup(): Promise<void>;
    public abstract async shutdown(): Promise<void>;
    public abstract async processServers(): Promise<Server[]>;

    public abstract getUserId(): string;
}
