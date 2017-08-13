import { createConnection, Entity, Column, PrimaryGeneratedColumn, Connection } from "typeorm";

export class DB {
    public static connection: Connection;

    static setup(): Promise<void> {
        return createConnection({
            type: "sqlite",
            database: "data.sqlite",
            entities: [
                __dirname + "/model/*.js"
            ],
            autoSchemaSync: true,
        }).then((connection) => {
            DB.connection = connection;
        });
    }
}