import { Entity, BaseEntity, ManyToOne, PrimaryGeneratedColumn, Column } from "typeorm";
import { DBServer } from "./dbserver";
import { DBUser } from "./dbuser";
import { RoleType } from "../core/roletype";

@Entity()
export class DBRoleLink extends BaseEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(type => DBUser, user => user.roles, {
        cascade: true
    })
    user!: DBUser;

    @ManyToOne(type => DBServer, server => server.roleLinks, {
        cascade: true
    })
    server!: DBServer;

    @Column("int")
    role!: RoleType;
}