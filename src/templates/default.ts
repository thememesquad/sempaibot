import { ITemplate } from "../core/itemplate";
import { TemplateMessageID } from "../core/itemplatemessageid";

const template: { [key: number]: any } = {};
template[TemplateMessageID.SempaiCalled] = [
    "Yes I'm here! What can I do for you?",
    "Yes I'm here! How can I help?",
    "Yes I'm here  <@{author}>! How can I help?",
    "What's up <@{author}>? How can I help you?",
    "I'm here! What's up?",
    "I'm here! What's up <@{author}>?",
];

template[TemplateMessageID.SempaiSettingUp] = [
    "Nice to meet you! Sempai is currently setting up on this server! Where do you want me to go?\r\n(use the command \"sempai go to #channel\")",
];

template[TemplateMessageID.SempaiHomeChannelChanged] = [
    "Okay then, <#{channel}> will be my new home channel! Hurray~! If you want to know more about what I can do, type \"sempai help me\".",
    "All right! This is my new home channel, huh? I like it. If you want to know more about what I can do, type \"sempai help me\".",
];

template[TemplateMessageID.SempaiHomeChannelDeleted] = [
    "You... you destroyed my home. :( All those good chat memories we had there. Gone! Where do I go now? (use the command \"sempai go to #channel\")",
    "Did...did you just delete my home? My home channel? Who would do such a thing? Wait, am I getting an upgrade? A better channel? (use the command \"sempai go to #channel\")",
    "Did...did you just destroy my home channel? You can't just do these things! Bots have rights too, you know! Where do I go now? (use the command \"sempai go to #channel\")",
    "You... deleted? My home channel? My home? Why...? So am I-... am I homeless now? A homeless bot? Or are you going to give me a new home? (use the command \"sempai go to #channel\")",
];

template[TemplateMessageID.CurrentUserRole] = [
    "Your role is {role}.",
];

template[TemplateMessageID.CurrentUserPermissions] = [
    "Your permissions are:",
];

template[TemplateMessageID.ModuleEnabled] = [
    "{module} module is now enabled!",
];

template[TemplateMessageID.ModuleDisabled] = [
    "{module} module is now disabled.",
];

template[TemplateMessageID.ListModules] = [
    "List of modules:",
];

template[TemplateMessageID.ListRoles] = [
    "List of roles:",
];

template[TemplateMessageID.ListPermissions] = [
    "List of permissions:",
];

template[TemplateMessageID.ListIgnores] = [
    "Ignore list:{list}",
];

template[TemplateMessageID.ListServers] = [
    "Sempai is currently running on:",
];

template[TemplateMessageID.RoleAssignedToUser] = [
    "Assigned {role} to <@{user}>.",
];

template[TemplateMessageID.StartedIgnoringUser] = [
    "Got it! I'll ignore <@{user}> from now on!",
];

template[TemplateMessageID.StoppedIgnoringUser] = [
    "Alright, I'll stop ignoring <@{user}>.",
];

template[TemplateMessageID.AddedPermissionToRole] = [
    "Added permission {permission} to {role}.",
];

template[TemplateMessageID.RemovedPermissionFromRole] = [
    "Removed permission {permission} from {role}.",
];

template[TemplateMessageID.ServerBlacklisted] = [
    "Ok, I blacklisted '{server_name}'.",
];

template[TemplateMessageID.ServerWhitelisted] = [
    "Ok, I whitelisted '{server_name}'.",
];

template[TemplateMessageID.ServerBlacklist] = [
    "This is my current server blacklist:{response}",
];

template[TemplateMessageID.InformServerBlacklisted] = [
    "I hate to be the bearer of bad news, but it turns out that I have to start ignoring this server. This server has just been blacklisted. :frowning:",
];

template[TemplateMessageID.InformServerWhitelisted] = [
    "Good news everybody! This server has just been removed from my blacklist which means I'm open to any conversation you guys want to have with me on this server! :smiley:",
];

template[TemplateMessageID.UserBlacklisted] = [
    "Ok, I blacklisted user <@{user}>.",
];

template[TemplateMessageID.UserWhitelisted] = [
    "Ok, I whitelisted user <@{user}>.",
];

template[TemplateMessageID.UserBlacklist] = [
    "This is my current user blacklist:{response}",
];

template[TemplateMessageID.UnknownError] = [
    "Error, error, error! If you see this message, please consider contacting the developers on github here: https://github.com/thememesquad/sempaibot/",
];

template[TemplateMessageID.UnknownCommand] = [
    "Sempai doesn't understand.",
    "I... I don't understand. What do you want me to do?",
];

template[TemplateMessageID.PermissionDenied] = [
    "You don't have permission to do that.",
];

template[TemplateMessageID.ModuleAlreadyEnabled] = [
    "That module is already enabled!",
];

template[TemplateMessageID.ModuleAlreadyDisabled] = [
    "That module is already disabled!",
];

template[TemplateMessageID.ModuleCannotBeDisabled] = [
    "The {module} module can't be disabled.",
];

template[TemplateMessageID.ServerAlreadyBlacklisted] = [
    "{server_name} is already blacklisted!",
];

template[TemplateMessageID.ServerNotBlacklisted] = [
    "{server_name} is not blacklisted!",
];

template[TemplateMessageID.InvalidModule] = [
    "That's not a valid module name.",
];

template[TemplateMessageID.InvalidUser] = [
    "That user doesn't exist!",
];

template[TemplateMessageID.InvalidRole] = [
    "That's not a valid role!",
];

template[TemplateMessageID.InvalidChannel] = [
    "There's no channel with that name.",
];

template[TemplateMessageID.InvalidServer] = [
    "There is no server with that id!",
];

template[TemplateMessageID.IgnoreListEmpty] = [
    "I'm not ignoring anyone right now!",
];

template[TemplateMessageID.RoleAlreadyAssignedToUser] = [
    "Already assigned {role} to <@{user}>.",
];

template[TemplateMessageID.PleaseHelpTop] = [
    "This is the current list of commands:\r\n"
];

template[TemplateMessageID.HelpTop] = [
    "This is the current list of commands:\r\n"
];

template[TemplateMessageID.PleaseHelpBottom] = [
    "You could also prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work."
];

template[TemplateMessageID.HelpBottom] = [
    "You could also prefix the commands with - instead of sempai:\r\n**\"-remind me to ....\"** and **\"sempai remind me to ....\"** both work."
];

export class DefaultTemplate extends ITemplate {
    public messages(): { [key: number]: any; } {
        return template;
    }

    public id(): string {
        return "default";
    }

    public displayName(): string {
        return "Default";
    }
}
