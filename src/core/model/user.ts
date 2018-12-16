import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { UserRoleModel } from "./userrole";

@Entity()
export class UserModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "varchar", length: 255 })
    public discordId: string;

    @Column({ type: "varchar", length: 255 })
    public name: string;

    @OneToMany(type => UserRoleModel, (userrole: UserRoleModel) => userrole.user, {
        cascade: true
    })
    public roles: UserRoleModel[];
}
