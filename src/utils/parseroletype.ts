import { RoleType } from "../core/roletype";

export function parseRoleType(str: string): RoleType {
    switch (str.toLowerCase()) {
        case "superadmin":
            return RoleType.SuperAdmin;

        case "admin":
            return RoleType.Admin;

        case "moderator":
            return RoleType.Moderator;

        default:
            return RoleType.Normal;
    }
}
