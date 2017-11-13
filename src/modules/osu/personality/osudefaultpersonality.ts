import { MessageID, PersonalityBase } from "../../../core";
import { OsuMessageID } from "../osumessageid";

const personality: { [key: number]: string | string[] } = [];
personality[OsuMessageID.NotFollowingUser] = [
    "I'm not even following \"{user}\"!",
    "Sempai isn't even following \"{user}\"!"
];

personality[OsuMessageID.StoppedFollowing] = [
    "Okay, I have stopped following {user}.",
    "Sempai unfollowed {user}!",
    "Alright, I unfollowed {user}!",
    "Okay, I unfollowed {user}!",
    "Sempai will no longer follow {user}.",
    "I stopped following {user}!",
    "Sempai stopped following {user}!",
    "Got it! I've unfollowed {user}."
];

personality[OsuMessageID.StoppedFollowingWithMode] = [
    "Okay, I have stopped following {user} on {mode}.",
    "Sempai unfollowed {user} on {mode}!",
    "Alright, I unfollowed {user} on {mode}!",
    "Okay, I unfollowed {user} on {mode}!",
    "Sempai will no longer follow {user} on {mode}.",
    "I stopped following {user} on {mode}!",
    "Sempai stopped following {user} on {mode}!",
    "Got it! I've unfollowed {user} on {mode}."
];

personality[OsuMessageID.AddedFollowing] = [
    "I'm now following {user} on osu!",
    "Sempai will now follow {user} on osu!"
];

personality[OsuMessageID.AddedFollowingWithMode] = [
    "I'm now following {user} on osu {mode}!",
    "Sempai will now follow {user} on osu {mode}!"
];

personality[OsuMessageID.AlreadyFollowingUser] = [
    "I'm already following {user}!",
    "Sempai is already following {user}!"
];

personality[OsuMessageID.AlreadyFollowingUserWithMode] = [
    "I'm already following {user} on {mode}!",
    "Sempai is already following {user} on {mode}!"
];

personality[OsuMessageID.ReachedServerLimit] = [
    "Reached the user limit of '{limit}'."
];

personality[OsuMessageID.InvalidUser] = [
    "I can't find user \"{user}\". Did you type it correctly?",
    "I can't find user \"{user}\". Did you make a typo?",
    "I can't find user \"{user}\". Are you sure you typed it correctly?",
    "I can't find user \"{user}\". Are you sure you typed the name correctly?",
    "I'm having trouble finding \"{user}\". Did you type it correctly?",
    "I'm having trouble finding \"{user}\". Did you make a typo?",
    "I'm having trouble finding \"{user}\". Are you sure you typed it correctly?",
    "I'm having trouble finding \"{user}\". Are you sure you typed the name correctly?"
];

personality[OsuMessageID.InvalidUserWithMode] = [
    "I can't find user \"{user}\" on {mode}. Did you type it correctly?",
    "I can't find user \"{user}\" on {mode}. Did you make a typo?",
    "I can't find user \"{user}\" on {mode}. Are you sure you typed it correctly?",
    "I can't find user \"{user}\" on {mode}. Are you sure you typed the name correctly?",
    "I'm having trouble finding \"{user}\" on {mode}. Did you type it correctly?",
    "I'm having trouble finding \"{user}\" on {mode}. Did you make a typo?",
    "I'm having trouble finding \"{user}\" on {mode}. Are you sure you typed it correctly?",
    "I'm having trouble finding \"{user}\" on {mode}. Are you sure you typed the name correctly?"
];

personality[OsuMessageID.StartedFollowingUser] = [
    "I'm now following {user} on osu!",
    "Sempai will now follow {user} on osu!"
];

personality[OsuMessageID.StartedFollowingUserWithMode] = [
    "Sempai is currently following on {mode}:",
    "I'm currently following on {mode}:"
];

export class OsuDefaultPersonalityExpansion extends PersonalityBase {
    public messages(): { [key: number]: string | string[]; } {
        return personality;
    }

    public id(): string {
        return "osu";
    }

    public displayName(): string {
        return "osu";
    }
}
