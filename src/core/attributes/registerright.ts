import { RoleType } from "../roletype";

export function RegisterRight(name: string, defaultRole: RoleType) {

    return <T extends { new(...args: any[]): {} }>(constructor: T) => {
        if ((constructor as any).rights === undefined) {
            (constructor as any).rights = [];
        }

        (constructor as any).rights.push({
            name, defaultRole
        });

        return constructor;
    };
}
