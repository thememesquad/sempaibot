import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { RoleType } from "../core";
import { UserModel } from "./user";

@Entity()
export class UserRoleModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @OneToOne((type) => UserModel)
    @JoinColumn()
    public user: UserModel;

    @Column({ type: "varchar", length: 255 })
    public serverId: string;

    @Column({ type: "int" })
    public role: RoleType;
}
