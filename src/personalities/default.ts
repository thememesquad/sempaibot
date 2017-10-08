import { MessageID } from "../core/personality/messageid";
import { PersonalityBase } from "../core/personality/personalitybase";
import { StringFormat } from "../core/utils/util";

const personality: { [key: number]: any } = {};
personality[MessageID.SempaiCalled] = [
    "Yes I'm here! What can I do for you?",
    "Yes I'm here! How can I help?",
    "Yes I'm here  <@{author}>! How can I help?",
    "What's up <@{author}>? How can I help you?",
    "I'm here! What's up?",
    "I'm here! What's up <@{author}>?",
];

personality[MessageID.SempaiSettingUp] = [
    "Nice to meet you! Sempai is currently setting up on this server! Where do you want me to go?\r\n(use the command \"sempai go to #channel\")",
];

personality[MessageID.SempaiHomeChannelChanged] = [
    "Okay then, <#{channel}> will be my new home channel! Hurray~! If you want to know more about what I can do, type \"sempai help me\".",
    "All right! This is my new home channel, huh? I like it. If you want to know more about what I can do, type \"sempai help me\".",
];

personality[MessageID.SempaiHomeChannelDeleted] = [
    "You... you destroyed my home. :( All those good chat memories we had there. Gone! Where do I go now? (use the command \"sempai go to #channel\")",
    "Did...did you just delete my home? My home channel? Who would do such a thing? Wait, am I getting an upgrade? A better channel? (use the command \"sempai go to #channel\")",
    "Did...did you just destroy my home channel? You can't just do these things! Bots have rights too, you know! Where do I go now? (use the command \"sempai go to #channel\")",
    "You... deleted? My home channel? My home? Why...? So am I-... am I homeless now? A homeless bot? Or are you going to give me a new home? (use the command \"sempai go to #channel\")",
];

personality[MessageID.CurrentUserRole] = [
    "Your role is {role}.",
];

personality[MessageID.CurrentUserPermissions] = [
    "Your permissions are: {permissions}",
];

personality[MessageID.ModuleEnabled] = [
    "{module} module is now enabled!",
];

personality[MessageID.ModuleDisabled] = [
    "{module} module is now disabled.",
];

personality[MessageID.ListModules] = [
    "List of modules:",
];

personality[MessageID.ListRoles] = [
    "List of roles:",
];

personality[MessageID.ListPermissions] = [
    "List of permissions:",
];

personality[MessageID.ListIgnores] = [
    "Ignore list:{list}",
];

personality[MessageID.ListServers] = [
    "Sempai is currently running on:",
];

personality[MessageID.RoleAssignedToUser] = [
    "Assigned {role} to <@{user}>.",
];

personality[MessageID.StartedIgnoringUser] = [
    "Got it! I'll ignore <@{user}> from now on!",
];

personality[MessageID.StoppedIgnoringUser] = [
    "Alright, I'll stop ignoring <@{user}>.",
];

personality[MessageID.AddedPermissionToRole] = [
    "Added permission {permission} to {role}.",
];

personality[MessageID.RemovedPermissionFromRole] = [
    "Removed permission {permission} from {role}.",
];

personality[MessageID.ServerBlacklisted] = [
    "Ok, I blacklisted '{server_name}'.",
];

personality[MessageID.ServerWhitelisted] = [
    "Ok, I whitelisted '{server_name}'.",
];

personality[MessageID.ServerBlacklist] = [
    "This is my current server blacklist:{response}",
];

personality[MessageID.InformServerBlacklisted] = [
    "I hate to be the bearer of bad news, but it turns out that I have to start ignoring this server. This server has just been blacklisted. :frowning:",
];

personality[MessageID.InformServerWhitelisted] = [
    "Good news everybody! This server has just been removed from my blacklist which means I'm open to any conversation you guys want to have with me on this server! :smiley:",
];

personality[MessageID.UserBlacklisted] = [
    "Ok, I blacklisted user <@{user}>.",
];

personality[MessageID.UserWhitelisted] = [
    "Ok, I whitelisted user <@{user}>.",
];

personality[MessageID.UserBlacklist] = [
    "This is my current user blacklist:{response}",
];

personality[MessageID.UnknownError] = [
    "Error, error, error! If you see this message, please consider contacting the developers on github here: https://github.com/thememesquad/sempaibot/",
];

personality[MessageID.UnknownCommand] = [
    "Sempai doesn't understand.",
    "I... I don't understand. What do you want me to do?",
];

personality[MessageID.PermissionDenied] = [
    "You don't have permission to do that.",
];

personality[MessageID.ModuleAlreadyEnabled] = [
    "That module is already enabled!",
];

personality[MessageID.ModuleAlreadyDisabled] = [
    "That module is already disabled!",
];

personality[MessageID.ModuleCannotBeDisabled] = [
    "The {module} module can't be disabled.",
];

personality[MessageID.ServerAlreadyBlacklisted] = [
    "{server_name} is already blacklisted!",
];

personality[MessageID.ServerNotBlacklisted] = [
    "{server_name} is not blacklisted!",
];

personality[MessageID.InvalidModule] = [
    "That's not a valid module name.",
];

personality[MessageID.InvalidUser] = [
    "That user doesn't exist!",
];

personality[MessageID.InvalidRole] = [
    "That's not a valid role!",
];

personality[MessageID.InvalidChannel] = [
    "There's no channel with that name.",
];

personality[MessageID.InvalidServer] = [
    "There is no server with that id!",
];

personality[MessageID.IgnoreListEmpty] = [
    "I'm not ignoring anyone right now!",
];

personality[MessageID.RoleAlreadyAssignedToUser] = [
    "Already assigned {role} to <@{user}>.",
];

export class DefaultPersonality extends PersonalityBase {
    public id(): string {
        return "default";
    }

    public displayName(): string {
        return "Default";
    }

    public get(id: MessageID, args: { [key: string]: any; }): string {
        let str: string | string[] = personality[id];

        if (Array.isArray(str))
            str = str[Math.floor(Math.random() * str.length)];

        return StringFormat(str as string, args);
    }
}
