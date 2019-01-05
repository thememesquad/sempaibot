export enum RoleType {
    SuperAdmin,
    Normal,
    Moderator,
    Admin
}

export const roleNames = {
    [RoleType.SuperAdmin]: "SuperAdmin",
    [RoleType.Admin]: "Admin",
    [RoleType.Moderator]: "Moderator",
    [RoleType.Normal]: "Normal"
};