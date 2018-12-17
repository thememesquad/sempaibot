import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { DBServer } from "./dbserver";
import { DBRole } from "./dbrole";
import { RoleType } from "../roletype";
import { superadmins } from "../../../config";

@Entity()
export class DBUser
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @ManyToMany(type => DBServer, server => server.users, {
        cascade: true
    })
    servers!: DBServer[];

    @OneToMany(type => DBRole, role => role.user, {
        eager: true
    })
    roles!: DBRole[];

    @Column()
    blacklisted: boolean = false;

    public getRole(server: DBServer | null): RoleType {
        if (superadmins.indexOf(this.id) !== -1) {
            return RoleType.SuperAdmin;
        }

        if (server === null) {
            return RoleType.Normal;
        }

        const role = this.roles.find((item) => {
            return item.server == server;
        }) || null;

        if (!role) {
            return RoleType.Normal;
        }

        return role.role;
    }
}