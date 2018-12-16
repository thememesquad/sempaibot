import { Column, Connection, createConnection, Entity, PrimaryGeneratedColumn } from "typeorm";

export class DB {
    public static connection: Connection;

    public static setup(): Promise<void> {
        return createConnection({
            database: "data.sqlite",
            entities: [
                __dirname + "/../**/model/*.js",
                __dirname + "/../**/model/*.ts",
            ],
            type: "sqlite",
        }).then((connection) => {
            DB.connection = connection;
            return connection.synchronize();
        });
    }
}
