import { Entity, Column, PrimaryColumn, ManyToMany, OneToMany, JoinTable, BaseEntity } from "typeorm";
import { DBUser } from "./dbuser";
import { DBRole } from "./dbrole";
import { DBModule } from "./dbmodule";
import { Bot } from "../core/bot";
import { LogManager, AccessManager } from "../core/managers";
import { RoleType } from "../core/roletype";
import { DBPermission } from "./dbpermission";
import * as _ from "lodash";
import { DBRoleLink } from "./dbrolelink";
import { IModule } from "../core/imodule";
import { DBTrackedMessage } from "./dbtrackedmessage";

@Entity()
export class DBServer extends BaseEntity
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @ManyToMany(type => DBUser, user => user.servers)
    @JoinTable()
    users!: Promise<DBUser[]>;

    @ManyToMany(type => DBModule, module => module.servers)
    @JoinTable()
    modules!: Promise<DBModule[]>;

    @OneToMany(type => DBRole, role => role.server)
    roles!: Promise<DBRole[]>;

    @OneToMany(type => DBRoleLink, link => link.server)
    roleLinks!: Promise<DBRoleLink[]>;

    @OneToMany(type => DBTrackedMessage, message => message.server)
    messages!: Promise<DBTrackedMessage[]>;

    @Column()
    blacklisted: boolean = false;

    public async isModuleEnabled(moduleName: string): Promise<boolean>
    {
        moduleName = moduleName.toLowerCase().trim();
        const instance: IModule = Bot.instance.get(moduleName) as IModule;
        const modules = await this.modules;

        if (!instance) {
            return false;
        }

        if (instance.alwaysOn) {
            return true;
        }

        if (modules.length === 0) {
            return false;
        }

        const module = modules.reduce((x, y) => x.name === moduleName ? x : y);

        return module.name === moduleName;
    }

    public async isAllowed(roleType: RoleType, slug: string): Promise<boolean>
    {
        return await Bot.instance.get(AccessManager).isAllowed(slug, roleType, this);
    }

    public async allow(permission: DBPermission, roleType: RoleType)
    {
        const roles = await this.roles;
        const role = roles.reduce((x, y) => x.role === roleType ? x : y);

        if (role.role !== roleType) {
            Bot.instance.get(LogManager).warning(`Role not registered with this server: ${roleType}`);
            Bot.instance.get(LogManager).todo("DBServer::allow", "register the role with all the needed default permissions");

            return;
        }

        let permissionRoles: DBRole[] = await permission.roles;
        permissionRoles.push(role);
        permissionRoles = _.chain(permissionRoles)
            .uniqWith((lhs: DBRole, rhs: DBRole) => {
                return lhs.role === rhs.role;
            }).value();

        permission.roles = Promise.resolve(permissionRoles);

        await permission.save();
    }

    public async disallow(permission: DBPermission, roleType: RoleType)
    {
        const roles = await this.roles;
        const role = roles.reduce((x, y) => x.role === roleType ? x : y);

        if (role.role !== roleType) {
            Bot.instance.get(LogManager).warning(`Role not registered with this server: ${roleType}`);
            Bot.instance.get(LogManager).todo("DBServer::allow", "register the role with all the needed default permissions");

            return;
        }

        let permissionRoles: DBRole[] = await permission.roles;
        permission.roles = Promise.resolve(permissionRoles.filter(x => x.role !== roleType));
        await permission.save();
    }

    public async enableModule(moduleName: string): Promise<boolean>
    {
        moduleName = moduleName.toLowerCase().trim();
        const instance: IModule = Bot.instance.get(moduleName) as IModule;
        let modules = await this.modules;

        if (!instance) {
            return false;
        }

        if (instance.alwaysOn) {
            return true;
        }

        if (modules.length > 0) {
            const module = modules.reduce((x, y) => x.name === moduleName ? x : y);

            if (module.name === moduleName) {
                return true;
            }
        }

        const databaseModule: DBModule = await DBModule.findOne({
            name: moduleName
        });

        if (!databaseModule) {
            return false;
        }

        modules.push(databaseModule);
        this.modules = Promise.resolve(modules);

        await this.save();
        return true;
    }

    public async disableModule(moduleName: string): Promise<boolean>
    {
        moduleName = moduleName.toLowerCase().trim();
        const instance: IModule = Bot.instance.get(moduleName) as IModule;
        let modules = await this.modules;

        if (!instance) {
            return false;
        }

        if (instance.alwaysOn) {
            return false;
        }

        if (modules.length === 0) {
            return true;
        }

        modules = modules.filter(x => x.name !== moduleName);

        this.modules = Promise.resolve(modules);
        await this.save();

        return true;
    }

    public async getRolePermissions(roleType: RoleType): Promise<string[]>
    {
        const roles = await this.roles;
        let permissions: DBPermission[] = _.chain(await Promise.all(roles.filter(x => x.role === roleType).map(x => x.permissions)))
            .flatten()
            .uniqWith((lhs: DBPermission, rhs: DBPermission) => {
                return lhs.id === rhs.id;
            }).value();

        return permissions.map(x => x.slug);
    }

    public setChannel(channelId: string, category: string = null): void
    {
        if (category === null) {
            // todo
            return;
        }

        // todo
    }

    public getChannel(category: string = null): string
    {
        return null;
    }
}