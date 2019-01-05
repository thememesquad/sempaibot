import { IManager } from "./imanager";
import { injectable } from "inversify";
import { DBServer } from "../../models/dbserver";
import { LogManager } from "./logmanager";
import { RoleType } from "../roletype";
import { DatabaseManager } from "./databasemanager";
import { DBPermission } from "../../models/dbpermission";

@injectable()
export class AccessManager implements IManager
{
    private _logManager: LogManager;
    private _databaseManager: DatabaseManager;

    public constructor(logManager: LogManager, databaseManager: DatabaseManager)
    {
        this._logManager = logManager;
        this._databaseManager = databaseManager;
    }

    async startup()
    {
        return true;
    }

    async register(slug: string, roleType: RoleType)
    {
        let permission = await DBPermission.findOne({
            slug
        }) || null;

        if (permission) {
            return;
        }

        this._logManager.warning(`New permission slug registered '${slug}' for role '${roleType}'`);

        permission = new DBPermission();
        permission.slug = slug;
        permission.defaultRole = roleType;
        await permission.save();

        // Register the slug with the existing servers
        const servers = await DBServer.find({
            relations: ["roles", "roles.permissions"]
        });

        for (const server of servers) {
            for (let i = 0; i < roleType + 1; i++) {
                await server.allow(permission, i as RoleType);
            }
        }
    }

    async isAllowed(slug: string, roleType: RoleType, server: DBServer)
    {
        const permissions = await server.getRolePermissions(roleType);

        return permissions.map(x => x.toUpperCase()).indexOf(slug.toUpperCase()) !== -1;
    }
}