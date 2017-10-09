import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { UserRoleModel } from "./userrole";

@Entity()
export class UserModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "varchar", length: 255 })
    public discordId: string;

    @Column({ type: "varchar", length: 255 })
    public name: string;

    @OneToMany((type) => UserRoleModel, (model) => model.user)
    public roles: UserRoleModel[];
}
