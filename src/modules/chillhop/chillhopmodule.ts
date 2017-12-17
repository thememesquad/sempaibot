import {
    Bot,
    Command,
    CommandDescription,
    CommandOptions,
    CommandPermission,
    CommandSample,
    IMessage,
    Module,
    ModuleBase,
    ModuleOptions,
    PermissionManager,
    ReactionId,
    ReactionManager,
    RoleType
} from "../../core";

import {
    Events,
    Submissions
} from "../../core/model";

@Module("chillhop", "This is a community module for chillhop!")
export class ChillhopModule extends ModuleBase {
    constructor() {
        super();

        PermissionManager.instance.register("MANAGE_CHILLHOP", RoleType.Admin);
    }

    public onSetup() {
        this._bot.addHookable("chillhop", this, "_handleEvent");
    }

    public onShutdown() {
        this._bot.removeHookable("chillhop");
    }

    public async _handleEvent(message: IMessage) {
        const channel: string = message.channel.id;

        const event = await Events.findOne({ channelid: channel });

        if (event === undefined) {
            return;
        }

        const submission = new Submissions();
        submission.messageid = message.id;
        submission.content = message.content;
        submission.upvotes = 0;
        submission.downvotes = 0;
        submission.channelid = channel;
        submission.save();

        ReactionManager.instance.registerMessage(
            message,
            {
                [ReactionId.ThumbsUp]: (added, user) => {
                    if (added) {
                        submission.upvotes++;
                        submission.save();
                    } else {
                        submission.upvotes--;
                        submission.save();
                    }
                },
                [ReactionId.ThumbsDown]: (added, user) => {
                    if (added) {
                        submission.downvotes++;
                        submission.save();
                    } else {
                        submission.downvotes--;
                        submission.save();
                    }
                }
            },
            false
        );
    }

    @Command("start event in {channelid!channel}")
    @CommandSample("start event in __*#channel*__")
    @CommandDescription("Starts a community vote event in the desired channel.")
    @CommandPermission("MANAGE_CHILLHOP")
    private async handleEvent(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;

        if (!message.server.server.channels.exists("id", channel)) {
            return await this._bot.respond(message, "Couldn't find the channel, do I have permissions?") as IMessage;
        }

        const eventExists = await Events.find({ channelid: channel });

        if (eventExists.length > 0) {
            return await this._bot.respond(message, "I'm already holding an event here!") as IMessage;
        }

        const event = new Events();
        event.channelid = channel;
        event.save();

        return await this._bot.respond(message, "Successfully started watching the channel") as IMessage;
    }

    @Command("end event in {channelid!channel}")
    @CommandSample("end event in __*#channel*__")
    @CommandDescription("Ends a community vote event in the desired channel.")
    @CommandPermission("MANAGE_CHILLHOP")
    private async handleEndEvent(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;

        if (!message.server.server.channels.exists("id", channel)) {
            return await this._bot.respond(message, "Couldn't find the channel, do I have permissions?") as IMessage;
        }

        const event = await Events.find({ channelid: channel });

        if (event.length <= 0) {
            return await this._bot.respond(message, "I'm not holding an event here!") as IMessage;
        }

        Events.remove(event);

        return await this._bot.respond(message, "Successfully ended the event!") as IMessage;
    }

    @Command("get top {num} upvoted in {channelid!channel}")
    @CommandSample("get top __*10*__ upvoted in __*#channel*__")
    @CommandDescription("Get the top number of upvoted submissions.")
    private async handleMostUpvoted(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;
        const num: number = args.num;

        const event = await Events.findOne({ channelid: channel });

        if (event === undefined) {
            return await this._bot.respond(message, "I'm not holding an event in this channel!") as IMessage;
        }

        const submissions = await Submissions.find({ channelid: channel });

        // Sort the submissions based on how many upvotes they have
        submissions.sort((a, b) => (a.upvotes - a.downvotes) > (b.upvotes - b.downvotes) ? -1 : (a.upvotes - a.downvotes) < (b.upvotes - b.downvotes) ? 1 : 0);

        // Loop through either the top number or the submission length
        const loop = Math.min(submissions.length, num);

        for (let i = 0; i < loop; i++) {
            const submission = submissions[i];
            await this._bot.respond(message, `The #${i + 1} song with :thumbsup: [${submission.upvotes}] and :thumbsdown: [${submission.downvotes}]\n${submission.content}`);
        }
    }
}
