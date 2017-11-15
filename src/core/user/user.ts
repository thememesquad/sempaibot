import * as Discord from "discord.js";
import { Repository } from "typeorm";
import { Config } from "../../../config";
import { DB } from "../index";
import { UserModel, UserRoleModel } from "../model";
import { RoleType } from "../permission/roletype";
import { Server } from "../server";

export class User {
    private _name: string;
    private _userID: string;
    private _roles: { [key: string]: RoleType };
    private _model: UserModel;
    private _repository: Repository<UserModel>;
    private _roleRepository: Repository<UserRoleModel>;

    constructor(user?: UserModel) {
        if (user) {
            this._model = user;
            this._name = user.name;
            this._userID = user.discordId;
            this._roles = {};

            for (const role of user.roles) {
                this._roles[role.serverId] = role.role;
            }
        } else {
            this._model = null;
        }

        this._repository = DB.connection.getRepository(UserModel);
        this._roleRepository = DB.connection.getRepository(UserRoleModel);
    }

    public save(): Promise<void> {
        if (this._model === null) {
            this._model = this._repository.create();
            this._model.roles = [];
        }

        this._model.name = this._name;
        this._model.discordId = this._userID;

        for (const server in this._roles) {
            let found = false;

            for (const role of this._model.roles) {
                if (role.serverId === server) {
                    role.role = this._roles[server];
                    found = true;

                    break;
                }
            }

            if (!found) {
                const role = this._roleRepository.create();
                role.role = this._roles[server];
                role.serverId = server;
                role.user = this._model;

                this._model.roles.push(role);
            }
        }

        return this._repository.save(this._model).then(() => {
            // empty
         });
    }

    public setUsername(name: string): void {
        this._name = name;
    }

    public setUserID(id: string): void {
        this._userID = id;
    }

    public setRoles(roles: {[key: string]: RoleType}): void {
        this._roles = roles;
    }

    public setRole(server: Server, role: RoleType): void {
        this._roles[server.id] = role;
    }

    public getRole(server: Server): RoleType {
        if (server === null || server === undefined) {
            if (Config.superadmins.indexOf(this._userID) !== -1)
                return RoleType.SuperAdmin;

            return RoleType.Normal;
        }

        if (Config.superadmins.indexOf(this._userID) !== -1) {
            if (this._roles[server.id] === undefined || this._roles[server.id] !== RoleType.SuperAdmin) {
                this._roles[server.id] = RoleType.SuperAdmin;

                this.save().catch((err) => {
                    console.log(err);
                });
            }

            return RoleType.SuperAdmin;
        }

        if (this._roles[server.id] === undefined) {
            this._roles[server.id] = RoleType.Normal;

            this.save().catch((err) => {
                console.log(err);
            });
        }

        return this._roles[server.id];
    }

    public getUsername(): string {
        return this._name;
    }

    public getName(server: Server): string {
        for (const key of server.server.members.keyArray()) {
            const member = server.server.members.get(key);

            if (member.id === this._userID) {
                if (member.nickname)
                    return member.nickname;

                return this._name;
            }
        }

        return this._name;
    }

    public getDetailedName(server: Server, member?: Discord.GuildMember): string {
        if (member === undefined) {
            for (const key of server.server.members.keyArray()) {
                const tmp = server.server.members.get(key);

                if (tmp.id === this._userID) {
                    member = tmp;
                    break;
                }
            }
        }

        if (member === undefined)
            return this._name + "#unknown";

        let name: string;
        const details = member.nickname;
        if (member.nickname) {
            name = member.nickname + " (" + this._name + "#" + member.id + ")";
        } else {
            name = this._name + "#" + member.id;
        }

        return name;
    }

    public getUserID(): string {
        return this._userID;
    }
}
