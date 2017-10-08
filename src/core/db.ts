import { Column, Connection, createConnection, Entity, PrimaryGeneratedColumn } from "typeorm";

export class DB {
    public static connection: Connection;

    public static setup(): Promise<void> {
        return createConnection({
            autoSchemaSync: true,
            database: "data.sqlite",
            entities: [
                __dirname + "/../model/*.js",
            ],
            type: "sqlite",
        }).then((connection) => {
            DB.connection = connection;
        });
    }
}
