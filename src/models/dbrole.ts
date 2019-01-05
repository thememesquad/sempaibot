import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne, ManyToMany, JoinTable, BaseEntity } from "typeorm";
import { DBServer } from "./dbserver";
import { RoleType } from "../core/roletype";
import { DBPermission } from "./dbpermission";

@Entity()
export class DBRole extends BaseEntity
{
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(type => DBServer, server => server.roles, {
        cascade: true
    })
    server!: DBServer;

    @ManyToMany(type => DBPermission, permission => permission.roles, {
        cascade: true
    })
    @JoinTable()
    permissions!: Promise<DBPermission[]>;

    @Column("int")
    public role!: RoleType;
}