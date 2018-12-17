export enum TemplateMessageID {
    SempaiCalled,
    SempaiSettingUp,
    SempaiHomeChannelChanged,
    SempaiHomeChannelDeleted,

    CurrentUserRole,
    CurrentUserPermissions,

    ModuleEnabled,
    ModuleDisabled,

    ListModules,
    ListRoles,
    ListPermissions,
    ListIgnores,
    ListServers,

    RoleAssignedToUser,
    StartedIgnoringUser,
    StoppedIgnoringUser,

    AddedPermissionToRole,
    RemovedPermissionFromRole,

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

    ModuleAlreadyEnabled,
    ModuleAlreadyDisabled,
    ModuleCannotBeDisabled,

    ServerAlreadyBlacklisted,
    ServerNotBlacklisted,

    InvalidModule,
    InvalidUser,
    InvalidRole,
    InvalidChannel,
    InvalidServer,

    IgnoreListEmpty,

    RoleAlreadyAssignedToUser,

    PleaseHelpTop,
    HelpTop,

    PleaseHelpBottom,
    HelpBottom
}
