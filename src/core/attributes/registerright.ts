import { RoleType } from "../roletype";

export function RegisterRight(name: string, defaultRole: RoleType) {
    return <T extends { new(...args: any[]): {} }>(constructor: T) => {
        return constructor;
    };
}
