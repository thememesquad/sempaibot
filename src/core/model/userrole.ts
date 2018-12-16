import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RoleType } from "../";
import { UserModel } from "./user";

@Entity()
export class UserRoleModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne(type => UserModel, (user: UserModel) => user.roles)
    public user: UserModel;

    @Column({ type: "varchar", length: 255 })
    public serverId: string;

    @Column({ type: "int" })
    public role: RoleType;
}
