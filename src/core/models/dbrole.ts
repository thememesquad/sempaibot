import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { DBServer } from "./dbserver";
import { DBUser } from "./dbuser";
import { RoleType } from "../roletype";
import { DBPermission } from "./dbpermission";

@Entity()
export class DBRole
{
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(type => DBServer, server => server.roles, {
        cascade: true
    })
    server!: DBServer;

    @ManyToOne(type => DBUser, user => user.roles, {
        cascade: true
    })
    @JoinColumn()
    user!: DBUser;

    @ManyToMany(type => DBPermission, permission => permission.roles, {
        cascade: true,
        eager: true
    })
    @JoinTable()
    permissions!: DBPermission[];

    @Column("int")
    public role!: RoleType;
}