import { IManager } from "./imanager";
import { injectable } from "inversify";
import { createConnection, Connection, Repository } from "typeorm";
import { LogManager } from "./logmanager";
import { DBUser } from "../models/dbuser";
import { DBServer } from "../models/dbserver";
import { DBRole } from "../models/dbrole";

@injectable()
export class DatabaseManager implements IManager
{
    private _connection!: Connection;
    private _logManager: LogManager;

    public constructor(logManager: LogManager)
    {
        this._logManager = logManager;
    }

    public getUserRepository(): Repository<DBUser>
    {
        return this.getRepository(DBUser);
    }

    public getServerRepository(): Repository<DBServer>
    {
        return this.getRepository(DBServer);
    }

    public getRoleRepository(): Repository<DBRole>
    {
        return this.getRepository(DBRole);
    }

    public getRepository<T>(type: new() => T): Repository<T>
    {
        return this._connection.getRepository(type);
    }

    public save<Entity>(data: Entity): Promise<Entity>;
    public save<Entity>(data: Entity[]): Promise<Entity[]>
    public save<Entity>(data: Entity | Entity[]): Promise<Entity | Entity[]>
    {
        return this._connection.manager.save(data);
    }

    async startup()
    {
        try {
            this._connection = await createConnection({
                database: "data.sqlite",
                entities: [
                    __dirname + "/../../**/models/*.js",
                    __dirname + "/../../**/models/*.ts",
                ],
                subscribers: [
                    __dirname + "/../../**/model_subscribers/*.js",
                    __dirname + "/../../**/model_subscribers/*.ts",
                ],
                type: "sqlite",
            });

            await this._connection.synchronize();
        } catch (e) {
            this._logManager.error("database error", e);
        }

        return true;
    }
}