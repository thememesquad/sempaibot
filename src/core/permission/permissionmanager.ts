import { Server } from "../server";
import { Role } from "./role";
import { RoleType } from "./roletype";

export class PermissionManager {
    private static _instance: PermissionManager = new PermissionManager();

    private _roles: { [key: string]: Role };
    private _permissions: string[];

    constructor() {
        this._roles = {};
        this._roles[RoleType.SuperAdmin] = new Role(RoleType.SuperAdmin, { global: true });
        this._roles[RoleType.Admin] = new Role(RoleType.Admin);
        this._roles[RoleType.Moderator] = new Role(RoleType.Moderator);
        this._roles[RoleType.Normal] = new Role(RoleType.Normal, { default: true });

        this._permissions = [];
    }

    public async save(): Promise<void> {
        await this._roles[RoleType.SuperAdmin].save();
        await this._roles[RoleType.Admin].save();
        await this._roles[RoleType.Moderator].save();
        await this._roles[RoleType.Normal].save();
    }

    public async load(): Promise<void> {
        await this._roles[RoleType.SuperAdmin].load();
        await this._roles[RoleType.Admin].load();
        await this._roles[RoleType.Moderator].load();
        await this._roles[RoleType.Normal].load();
    }

    public register(name: string, defaultRole?: RoleType): void {
        defaultRole = defaultRole || RoleType.Normal;

        // Can't register a permission twice
        if (this._permissions.indexOf(name) !== -1) {
            console.log("Permission '" + name + "' already registered.");
            return;
        }

        this._permissions.push(name);

        for (let i = 0; i < RoleType.SuperAdmin; i++) {
            if (i >= defaultRole)
                this._roles[i].add(null, name);
            else
                this._roles[i].remove(null, name);
        }
    }

    public add(name: string, role: RoleType, server: Server): void {
        this._roles[role].add(server, name);
        this._roles[role].save();
    }

    public remove(name: string, role: RoleType, server: Server): void {
        this._roles[role].remove(server, name);
        this._roles[role].save();
    }

    public isAllowed(name: string, role: RoleType, server: Server): boolean {
        return this._roles[role].isAllowed(server, name);
    }

    public getRole(name: RoleType): Role {
        return this._roles[name];
    }

    public static get instance(): PermissionManager {
        return PermissionManager._instance;
    }
}
