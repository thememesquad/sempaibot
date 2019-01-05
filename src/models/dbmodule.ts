import { Entity, Column, ManyToMany, JoinTable, PrimaryGeneratedColumn, BaseEntity, OneToMany } from "typeorm";
import { DBServer } from "./dbserver";
import { DBTrackedMessage } from "./dbtrackedmessage";

@Entity()
export class DBModule extends BaseEntity
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { length: 255 })
    name!: string;

    @ManyToMany(type => DBServer, server => server.users, {
        cascade: true
    })
    @JoinTable()
    servers!: Promise<DBServer[]>;

    @OneToMany(type => DBTrackedMessage, message => message.module)
    messages!: Promise<DBTrackedMessage[]>;
}