import { Command } from "../core/command/attributes/command";
import { CommandDescription } from "../core/command/attributes/commanddescription";
import { CommandSample } from "../core/command/attributes/commandexample";
import { CommandPermission } from "../core/command/attributes/commandpermission";
import { CommandOptions } from "../core/command/commandoptions";
import { Module } from "../core/module/attributes/module";
import { IMessageInterface } from "../core/module/messageinterface";
import { ModuleBase } from "../core/module/modulebase";
import { ModuleOptions } from "../core/module/moduleoptions";
import { PermissionManager } from "../core/permission/manager";
import { RoleType } from "../core/permission/roletype";
import { MessageID } from "../core/personality/messageid";
import { PersonalityManager } from "../core/personality/personalitymanager";
import { User } from "../core/user/user";
import { UserManager } from "../core/user/usermanager";
import { GenerateTable } from "../core/utils/util";

@Module("Admin", "This is the admin module.", ModuleOptions.AlwaysOn | ModuleOptions.Hidden)
export class AdminModule extends ModuleBase {
    constructor() {
        super();

        PermissionManager.instance.register("SUPERADMIN", RoleType.SuperAdmin);
        PermissionManager.instance.register("IGNORE_USERS", RoleType.Moderator);
        PermissionManager.instance.register("GO_TO_CHANNEL", RoleType.Moderator);
        PermissionManager.instance.register("MANAGE_MODULES", RoleType.Admin);
        PermissionManager.instance.register("MANAGE_PERMISSIONS", RoleType.Admin);
        PermissionManager.instance.register("ASSIGN_ROLES", RoleType.Admin);
    }

    @Command("blacklist server {int!server}", CommandOptions.Global)
    @CommandSample("blacklist server __*server*__")
    @CommandDescription("Blacklists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerBlacklist(message: IMessageInterface, args: { [key: string]: any }): void {
        /*const server = this._bot.getInternalServer(args.server - 1);

        if (server === null) {
            this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidServer, {
                author: message.author.id,
                id: args.server,
            }));

            return;
        }

        if (this._bot.isServerBlacklisted(server.id)) {
            this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerAlreadyBlacklisted, {
                author: message.author.id,
                server_name: server.server.name,
            }));

            return;
        }

        this._bot.blacklistServer(server.id);
        this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerBlacklisted, {
            author: message.author.id,
            server_name: server.server.name,
        }));*/
    }

    @Command("whitelist server {int!server}", CommandOptions.Global)
    @CommandSample("whitelist server __*server*__")
    @CommandDescription("Whitelists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerWhitelist(message: IMessageInterface, args: { [key: string]: any }) {
        /*const server = this._bot.getInternalServer(args.server - 1);

        if (server === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidServer, {
                author: message.author.id,
                id: args.server,
            }));

        if (!this._bot.isServerBlacklisted(server.id))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerNotBlacklisted, {
                author: message.author.id,
                server_name: server.server.name,
            }));

        this._bot.whitelistServer(server.id);
        this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerWhitelisted, {
            author: message.author.id,
            server_name: server.server.name,
        }));*/
    }

    @Command("blacklist user {userid!user}", CommandOptions.Global)
    @CommandSample("blacklist user __*@user*__")
    @CommandDescription("Blacklists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserBlacklist(message: IMessageInterface, args: { [key: string]: any }) {
        const user: User = UserManager.instance.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
                author: message.author.id,
                user: args.user,
            }));

        this._bot.blacklistUser(user);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserBlacklisted, {
            author: message.author.id,
            user: user._userID,
        }));
    }

    @Command("whitelist user {userid!user}", CommandOptions.Global)
    @CommandSample("whitelist user __*@user*__")
    @CommandDescription("Whitelists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserWhitelist(message: IMessageInterface, args: { [key: string]: any }) {
        const user: User = UserManager.instance.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
                author: message.author.id,
                user: args.user,
            }));

        this._bot.whitelistUser(user);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserWhitelisted, {
            author: message.author.id,
            user: user._userID,
        }));
    }

    @Command("show user blacklist", CommandOptions.Global)
    @CommandSample("show user blacklist")
    @CommandDescription("Displays the user blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowUserBlacklist(message: IMessageInterface, args: { [key: string]: any }) {
        let id = "ID";
        let name = "Name";

        while (id.length < 25)
            id += " ";

        while (name.length < 30)
            name += " ";

        let response = "```";
        response += id + " " + name;

        let num = 0;
        for (const key in UserManager.instance.users) {
            const user = UserManager.instance.users[key];

            if (!this._bot.isUserBlacklisted(user))
                continue;

            id = "" + user._userID;
            name = user._name;

            while (id.length < 25)
                id += " ";

            while (name.length < 30)
                name += " ";

            response += "\r\n";
            response += id + " " + name;
            num++;
        }

        if (num === 0) {
            response += "\r\n";
            response += "User blacklist is empty.";
        }

        response += "```";

        this._bot.respond(message, PersonalityManager.instance.get(MessageID.UserBlacklist, {
            author: message.author.id,
            response,
        }));
    }

    @Command("show server blacklist", CommandOptions.Global)
    @CommandSample("show server blacklist")
    @CommandDescription("Displays the server blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowServerBlacklist(message: IMessageInterface, args: { [key: string]: any }) {
        let id = "ID";
        let name = "Name";
        let owner = "Owner";

        while (id.length < 10)
            id += " ";

        while (name.length < 20)
            name += " ";

        while (owner.length < 20)
            owner += " ";

        let response = "```";
        response += id + " " + name + " " + owner;

        let num = 0;
        for (const key in this._bot.servers) {
            const server = this._bot.servers[key];
            if (!this._bot.isServerBlacklisted(server.id))
                continue;

            id = "#" + server.id + ".";
            name = server.server.name;
            owner = server.server.owner.displayName;

            while (id.length < 10)
                id += " ";

            while (name.length < 20)
                name += " ";

            while (owner.length < 20)
                owner += " ";

            response += "\r\n";
            response += id + " " + name + " " + owner;
            num++;
        }

        if (num === 0) {
            response += "\r\n";
            response += "Server blacklist is empty.";
        }
        response += "```";

        this._bot.respond(message, PersonalityManager.instance.get(MessageID.ServerBlacklist, {
            author: message.author.id,
            response,
        }));
    }

    @Command("list servers", CommandOptions.Global)
    @Command("show servers")
    @CommandSample("list servers")
    @CommandDescription("Lists all the servers I'm currently running on.")
    @CommandPermission("SUPERADMIN")
    private handleListServers(message: IMessageInterface, args: { [key: string]: any }) {
        const data = [];
        for (const key in this._bot.servers) {
            const server = this._bot.servers[key];
            if (this._bot.isServerBlacklisted(server.id))
                continue;

            data.push({
                id: "#" + server.id + ".",
                limit: "50", // "" + this._bot.internalServers[i].config.value.osu_limit
                name: server.server.name,
                owner: server.server.owner.nickname || server.server.owner.user.username,
            });
        }

        const messages = GenerateTable(PersonalityManager.instance.get(MessageID.ListServers, {
            author: message.author.id,
        }), { id: "ID", name: "Name", owner: "Owner", limit: "Limit" }, data);
        this._bot.respond(message, messages);
    }

    @Command("enable {module}")
    @Command("enable module {module}")
    @CommandSample("enable __*module name*__")
    @CommandDescription("Enables a module for this server.")
    @CommandPermission("MANAGE_MODULES")
    private handleEnableModule(message: IMessageInterface, args: { [key: string]: any }) {
        if (this._bot.getModule(args.module) === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidModule, {
                author: message.author.id,
                module: args.module,
            }));

        if (message.server.isModuleEnabled(args.module))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ModuleAlreadyEnabled, {
                author: message.author.id,
                module: args.module,
            }));

        message.server.enableModule(args.module);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ModuleEnabled, {
            author: message.author.id,
            module: args.module,
        }));
    }

    @Command("disable {module}")
    @Command("disable module {module}")
    @CommandSample("disable __*module name*__")
    @CommandDescription("Disables a module for this server.")
    @CommandPermission("MANAGE_MODULES")
    private handleDisableModule(message: IMessageInterface, args: { [key: string]: any }) {
        const module = this._bot.getModule(args.module);
        if (module === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidModule, {
                author: message.author.id,
                module: args.module,
            }));

        if (!message.server.isModuleEnabled(args.module))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ModuleAlreadyDisabled, {
                author: message.author.id,
                module: args.module,
            }));

        if (module.alwaysOn)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ModuleCannotBeDisabled, {
                author: message.author.id,
                module: args.module,
            }));

        message.server.disableModule(args.module);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.ModuleDisabled, {
            author: message.author.id,
            module: args.module,
        }));
    }

    @Command("list modules")
    @Command("show modules")
    @CommandSample("list modules")
    @CommandDescription("Lists all available modules.")
    @CommandPermission("MANAGE_MODULES")
    private handleListModules(message: IMessageInterface, args: { [key: string]: any }) {
        const columns = { name: "Name", enabled: "Enabled", flags: "Flags" };
        const data = [];

        for (const key in this._bot.modules) {
            const enabled = message.server.isModuleEnabled(key);
            const alwaysOn = this._bot.modules[key].alwaysOn;
            const defaultOn = this._bot.modules[key].defaultOn;
            const hidden = this._bot.modules[key].hidden;

            if (hidden)
                continue;

            let flags = "";
            if (alwaysOn)
                flags += "always_on";

            if (defaultOn)
                flags += flags.length === 0 ? "default_on" : " default_on";

            data.push({ name: key, enabled: (enabled) ? "yes" : "no", flags });
        }

        const messages = GenerateTable(PersonalityManager.instance.get(MessageID.ListModules, {
            author: message.author.id,
        }), columns, data, { name: 20, enabled: 10, flags: 15 });

        this._bot.respond(message, messages);
    }

    @Command("assign role {roletype!role} to user {userid!user}")
    @Command("assign {roletype!role} to user {userid!user}")
    @Command("assign role {roletype!role} to {userid!user}")
    @Command("assign {roletype!role} to {userid!user}")
    @Command("assign {roletype!role} {userid!user}")
    @CommandSample("assign __*role*__ to __*@user*__")
    @CommandDescription("Assigns the specified role to the specified user.")
    @CommandPermission("ASSIGN_ROLES")
    private handleAssignRole(message: IMessageInterface, args: { [key: string]: any }) {
        if (args.role === RoleType.SuperAdmin)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidRole, {
                author: message.author.id,
                role: args.role,
            }));

        const myRole = message.user.getRole(message.server);
        if (args.role < myRole)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        const user = UserManager.instance.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
                author: message.author.id,
                user: args.user,
            }));

        if (user.getRole(message.server) === args.role)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.RoleAlreadyAssignedToUser, {
                author: message.author.id,
                role: args.role,
                user: args.user,
            }));

        if (!UserManager.instance.assignRole(user._userID, message.server, args.role))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.UnknownError, {
                author: message.author.id,
            }));

        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.RoleAssignedToUser, {
            author: message.author.id,
            role: args.role,
            user: args.user,
        }));
    }

    @Command("add permission {permission} to role {roletype!role}")
    @Command("add {permission} to role {roletype!role}")
    @Command("add permission {permission} to {roletype!role}")
    @Command("add {permission} {roletype!role}")
    @CommandSample("add __*permission*__ to __*role*__")
    @CommandDescription("Adds the specified permission to the specified role.")
    @CommandPermission("MANAGE_PERMISSIONS")
    private handleAddPermission(message: IMessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        if (args.role === RoleType.SuperAdmin)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidRole, {
                author: message.author.id,
                role: args.role,
            }));

        const myRole = message.user.getRole(message.server);
        if (args.role < myRole)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        if (!PermissionManager.instance.isAllowed(args.permission, message.user.getRole(message.server), message.server))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        PermissionManager.instance.add(args.permission, args.role, message.server);
        this._bot.respond(message, PersonalityManager.instance.get(MessageID.AddedPermissionToRole, {
            author: message.author.id,
            permission: args.permission,
            role: args.role,
        }));
    }

    @Command("remove permission {permission} from role {roletype!role}")
    @Command("remove {permission} from role {roletype!role}")
    @Command("remove permission {permission} from {roletype!role}")
    @Command("remove {permission} {roletype!role}")
    @CommandSample("remove __*permission*__ from __*role*__")
    @CommandDescription("Removes the specified permission from the specified role.")
    @CommandPermission("MANAGE_PERMISSIONS")
    private handleRemovePermission(message: IMessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        if (args.role === RoleType.SuperAdmin)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidRole, {
                author: message.author.id,
                role: args.role,
            }));

        const myRole = message.user.getRole(message.server);
        if (args.role < myRole)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        if (!PermissionManager.instance.isAllowed(args.permission, message.user.getRole(message.server), message.server))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        PermissionManager.instance.remove(args.permission, args.role, message.server);
        this._bot.respond(message, PersonalityManager.instance.get(MessageID.RemovedPermissionFromRole, {
            author: message.author.id,
            permission: args.permission,
            role: args.role,
        }));
    }

    @Command("ignore {userid!user}")
    @Command("start ignoring {userid!user}")
    @CommandSample("ignore __*@user*__")
    @CommandDescription("Ignores the specified user.")
    @CommandPermission("IGNORE_USERS")
    private handleIgnoreUser(message: IMessageInterface, args: { [key: string]: any }) {
        const user = UserManager.instance.getUserById(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
                author: message.author.id,
                user: args.user,
            }));

        if (message.user.getRole(message.server) >= user.getRole(message.server))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, { author: message.author.id }));

        message.server.ignoreUser(user);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.StartedIgnoringUser, { author: message.author.id, user: user._userID }));
    }

    @Command("unignore {userid!user}")
    @Command("stop ignoring {userid!user}")
    @CommandSample("unignore __*@user*__")
    @CommandDescription("Stops ignoring the specified user.")
    @CommandPermission("IGNORE_USERS")
    private handleUnignoreUser(message: IMessageInterface, args: { [key: string]: any }) {
        const user = UserManager.instance.getUserById(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.InvalidUser, {
                author: message.author.id,
                user: args.user,
            }));

        if (message.user.getRole(message.server) >= user.getRole(message.server))
            return this._bot.respond(message, PersonalityManager.instance.get(MessageID.PermissionDenied, {
                author: message.author.id,
            }));

        message.server.unignoreUser(user);
        return this._bot.respond(message, PersonalityManager.instance.get(MessageID.StoppedIgnoringUser, {
            author: message.author.id,
            user: user._userID,
        }));
    }
}
