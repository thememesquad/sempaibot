import { IMessage, User } from "../";
import { ReactionId } from "./reactionid";

export type ReactionCallbacks = { [key: number]: (added: boolean, user: User) => void };

export interface IReactionMessage {
    message: IMessage;
    reactionids: ReactionCallbacks;
}
