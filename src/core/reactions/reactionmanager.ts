import { Bot, IMessage, User } from "../";
import { IReactionCallbacks } from "./index";
import { IReactionMessage } from "./ireactionmessage";
import { ReactionId } from "./reactionid";

export class ReactionManager {
    private static _instance: ReactionManager = new ReactionManager();
    private _messages: IReactionMessage[] = [];

    public registerMessage(message: IMessage, reactionids: IReactionCallbacks) {
        this._messages.push({
            message,
            reactionids
        });

        Bot.instance.addReaction(message, Object.keys(reactionids));
    }

    public async resetMessage(message: IMessage) {
        let reactionids = {};
        for (const msg of this._messages) {
            if (msg.message.id === message.id) {
                reactionids = msg.reactionids;
                break;
            }
        }

        await Bot.instance.clearReactions(message);
        await Bot.instance.addReaction(message, Object.keys(reactionids));
    }

    public async reaction(id: ReactionId, msg: IMessage, user: User): Promise<void> {
        for (const message of this._messages) {
            if (message.message.id !== msg.id)
                continue;

            if (typeof message.reactionids[id] === "undefined")
                continue;

            message.reactionids[id](true, user);
            Bot.instance.removeReaction(message.message, id, user);
            break;
        }
    }

    public static get instance() {
        return ReactionManager._instance;
    }
}
