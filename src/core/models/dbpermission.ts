import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne, ManyToMany, JoinTable } from "typeorm";
import { DBServer } from "./dbserver";
import { DBUser } from "./dbuser";
import { RoleType } from "../roletype";
import { DBRole } from "./dbrole";

@Entity()
export class DBPermission
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { length: 255 })
    name!: string;

    @ManyToMany(type => DBRole, role => role.permissions)
    @JoinTable()
    roles!: DBRole[];
}