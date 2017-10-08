import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UserModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "varchar", length: 255 })
    public discordId: string;

    @Column({ type: "varchar", length: 255 })
    public name: string;
}
