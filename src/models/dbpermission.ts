import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, ManyToOne, ManyToMany, JoinTable, BaseEntity } from "typeorm";
import { RoleType } from "../core/roletype";
import { DBRole } from "./dbrole";

@Entity()
export class DBPermission extends BaseEntity
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { length: 255 })
    slug!: string;

    @ManyToMany(type => DBRole, role => role.permissions)
    @JoinTable()
    roles!: Promise<DBRole[]>;

    @Column("int")
    defaultRole!: RoleType;
}