import { IManager } from "./imanager";
import { injectable } from "inversify";
import { DBRole } from "../models/dbrole";
import { DBServer } from "../models/dbserver";
import { LogManager } from "./logmanager";
import { RoleType } from "../roletype";

@injectable()
export class AccessManager implements IManager
{
    private _logManager: LogManager;

    public constructor(logManager: LogManager)
    {
        this._logManager = logManager;
    }

    async startup()
    {
        return true;
    }

    async isAllowed(right: string, role: RoleType, server: DBServer | null)
    {
        this._logManager.log("todo: implement right check for", right, role, server);
        return true;
    }
}