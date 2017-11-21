import { IMessage, User } from "../";
import { ReactionId } from "./reactionid";

export interface IReactionCallbacks { [key: number]: (added: boolean, user: User) => void; }

export interface IReactionMessage {
    message: IMessage;
    reactionids: IReactionCallbacks;
    remove: boolean;
}
