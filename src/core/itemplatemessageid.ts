export enum TemplateMessageID {
    SempaiCalled,
    SempaiSettingUp,
    SempaiHomeChannelChanged,
    SempaiHomeChannelDeleted,

    ListIgnores,
    ListServers,

    StartedIgnoringUser,
    StoppedIgnoringUser,

    ServerBlacklisted,
    ServerWhitelisted,
    ServerBlacklist,
    InformServerBlacklisted,
    InformServerWhitelisted,

    UserBlacklisted,
    UserWhitelisted,
    UserBlacklist,

    // Errors
    UnknownError,
    UnknownCommand,
    PermissionDenied,

    ServerAlreadyBlacklisted,
    ServerNotBlacklisted,

    InvalidModule,
    InvalidUser,
    InvalidChannel,
    InvalidServer,

    IgnoreListEmpty,

    Help,
    HelpDescription
}
