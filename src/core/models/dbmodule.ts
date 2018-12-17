import { Entity, Column, ManyToMany, JoinTable, PrimaryGeneratedColumn } from "typeorm";
import { DBServer } from "./dbserver";

@Entity()
export class DBModule
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { length: 255 })
    name!: string;

    @ManyToMany(type => DBServer, server => server.users, {
        cascade: true
    })
    @JoinTable()
    servers!: DBServer[];
}