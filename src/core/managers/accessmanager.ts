import { IManager } from "./imanager";
import { injectable } from "inversify";
import { DBServer } from "../models/dbserver";
import { LogManager } from "./logmanager";
import { RoleType } from "../roletype";
import { DatabaseManager } from "./databasemanager";
import { DBPermission } from "../models/dbpermission";

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

    async register(slug: string, role: RoleType)
    {
        const permissionRepository = this._databaseManager.getRepository(DBPermission);
        let permission = await permissionRepository.findOne({
            slug
        }) || null;

        if (!permission) {
            permission = new DBPermission();
        }

        permission.slug = slug;
        permission.defaultRole = role;
        await permissionRepository.save(permission);
    }

    async isAllowed(slug: string, roleType: RoleType, server: DBServer | null)
    {
        const permissionRepository = this._databaseManager.getRepository(DBPermission);
        const permission = await permissionRepository.findOne({
            slug
        }, { relations: ["roles"] }) || null;

        if (!permission) {
            this._logManager.warning("Unknown permission:", slug);
            return true;
        }

        if (!server) {
            return permission.defaultRole === roleType;
        }

        // let roles = permission.roles.filter(x => x.server.id === server.id);
        // let role: DBRole = null;

        // if (roles.length !== 0) {
        //     role = roles[0];
        // }

        return true;
    }
}