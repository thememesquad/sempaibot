import { ModuleBase, MessageInterface, Module, ModuleOptions, Command, CommandDescription, CommandSample, CommandPermission, CommandOptions } from "../modulebase";
import { Responses } from "../responses";
import { Users } from "../users";
import { StringFormat, GenerateTable } from "../util";

@Module("Admin", "This is the admin module.", ModuleOptions.AlwaysOn | ModuleOptions.Hidden)
export class AdminModule extends ModuleBase {
    constructor() {
        super();

        this._permissions.register("SUPERADMIN", "superadmin");
        this._permissions.register("IGNORE_USERS", "moderator");
        this._permissions.register("GO_TO_CHANNEL", "moderator");
        this._permissions.register("MANAGE_MODULES", "admin");
        this._permissions.register("MANAGE_PERMISSIONS", "admin");
        this._permissions.register("ASSIGN_ROLES", "admin");
    }

    @Command("blacklist server {int!server}", CommandOptions.Global)
    @CommandSample("blacklist server __*server*__")
    @CommandDescription("Blacklists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerBlacklist(message: MessageInterface, args: { [key: string]: any }): void {
        let server = this._bot.getInternalServer(args.server - 1);

        if (server === null) {
            this._bot.respond(message, StringFormat(Responses.get("INVALID_SERVER"), { author: message.author.id, id: args.server }));
            return;
        }

        if (this._bot.isServerBlacklisted(server.id)) {
            this._bot.respond(message, StringFormat(Responses.get("SERVER_ALREADY_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));
            return;
        }

        this._bot.blacklistServer(server.id);
        this._bot.respond(message, StringFormat(Responses.get("SERVER_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));
    }

    @Command("whitelist server {int!server}", CommandOptions.Global)
    @CommandSample("whitelist server __*server*__")
    @CommandDescription("Whitelists a server.")
    @CommandPermission("SUPERADMIN")
    private handleServerWhitelist(message: MessageInterface, args: { [key: string]: any }) {
        let server = this._bot.getInternalServer(args.server - 1);

        if (server === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_SERVER"), { author: message.author.id, id: args.server }));

        if (!this._bot.isServerBlacklisted(server.id))
            return this._bot.respond(message, StringFormat(Responses.get("SERVER_NOT_BLACKLISTED"), { author: message.author.id, server_name: server._server.name }));

        this._bot.whitelistServer(server.id);
        this._bot.respond(message, StringFormat(Responses.get("SERVER_WHITELISTED"), { author: message.author.id, server_name: server._server.name }));
    }

    @Command("blacklist user {userid!user}", CommandOptions.Global)
    @CommandSample("blacklist user __*@user*__")
    @CommandDescription("Blacklists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserBlacklist(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        this._bot.blacklistUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("BLACKLISTED_USER"), { author: message.author.id, user: user._userID }));
    }

    @Command("whitelist user {userid!user}", CommandOptions.Global)
    @CommandSample("whitelist user __*@user*__")
    @CommandDescription("Whitelists an user.")
    @CommandPermission("SUPERADMIN")
    private handleUserWhitelist(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        this._bot.whitelistUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("WHITELISTED_USER"), { author: message.author.id, user: user._userID }));
    }

    @Command("show user blacklist", CommandOptions.Global)
    @CommandSample("show user blacklist")
    @CommandDescription("Displays the user blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowUserBlacklist(message: MessageInterface, args: { [key: string]: any }) {
        let id = "ID";
        let name = "Name";

        while (id.length < 25)
            id += " ";

        while (name.length < 30)
            name += " ";

        let response = "```";
        response += id + " " + name;

        let num = 0;
        for (let key in Users.users) {
            if (!this._bot.isUserBlacklisted(Users.users[key]))
                continue;

            id = "" + Users.users[key]._userID;
            name = Users.users[key]._name;

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

        this._bot.respond(message, StringFormat(Responses.get("USER_BLACKLIST"), { author: message.author.id, response: response }));
    }

    @Command("show server blacklist", CommandOptions.Global)
    @CommandSample("show server blacklist")
    @CommandDescription("Displays the server blacklist")
    @CommandPermission("SUPERADMIN")
    private handleShowServerBlacklist(message: MessageInterface, args: { [key: string]: any }) {
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
        for (let i = 0; i < this._bot.internalServers.length; i++) {
            if (!this._bot.isServerBlacklisted(this._bot.internalServers[i].id))
                continue;

            id = "#" + (i + 1) + ".";
            name = this._bot.internalServers[i]._server.name;
            owner = this._bot.internalServers[i]._server.owner.displayName;

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

        this._bot.respond(message, StringFormat(Responses.get("SERVER_BLACKLIST"), { author: message.author.id, response: response }));
    }

    @Command("show statistics", CommandOptions.Global)
    @CommandDescription("Shows statistics for me server-wide.")
    @CommandSample("show statistics")
    @CommandPermission("SUPERADMIN")
    private handleShowStatistics(message: MessageInterface, args: { [key: string]: any }) {
        let msg = StringFormat(Responses.get("SHOW_STATISTICS"), {
            author: message.author.id,
            num_servers: 0,//stats.get_value("num_servers"),
            osu_num_users: 0,//stats.get_value("osu_num_users"),
            osu_last_minute: 0,//stats.get_value("osu_api_calls"),
            osu_average_day: 0,//stats.get_average_day_value("osu_api_calls"),
            osu_average_week: 0,//stats.get_average_week_value("osu_api_calls"),
            osu_average_month: 0,//stats.get_average_month_value("osu_api_calls"),
            osu_highest_day: 0,//stats.get_highest_day_value("osu_api_calls"),
            osu_highest_week: 0,//stats.get_highest_week_value("osu_api_calls"),
            osu_highest_month: 0,//stats.get_highest_month_value("osu_api_calls"),
            osu_last_day: 0,//stats.get_day_value("osu_api_calls"),
            osu_last_week: 0,//stats.get_week_value("osu_api_calls"),
            osu_last_month: 0,//stats.get_month_value("osu_api_calls"),
            osu_alltime: 0,//stats.get_alltime_value("osu_api_calls"),
            osu_api_queue: 0//this._bot.getModule("osu!").load_balancer.numRequests
        });

        this._bot.respond(message, msg);
    }

    @Command("list servers", CommandOptions.Global)
    @Command("show servers")
    @CommandSample("list servers")
    @CommandDescription("Lists all the servers I'm currently running on.")
    @CommandPermission("SUPERADMIN")
    private handleListServers(message: MessageInterface, args: { [key: string]: any }) {
        let data = [];
        for (let i = 0; i < this._bot.internalServers.length; i++) {
            if (this._bot.isServerBlacklisted(this._bot.internalServers[i].id))
                continue;

            data.push({
                id: "#" + (i + 1) + ".",
                name: this._bot.internalServers[i]._server.name,
                owner: this._bot.internalServers[i]._server.owner.nickname || this._bot.internalServers[i]._server.owner.user.username,
                limit: "50"//"" + this._bot.internalServers[i].config.value.osu_limit
            });
        }

        let messages = GenerateTable(StringFormat(Responses.get("LIST_SERVERS"), { author: message.author.id }), { id: "ID", name: "Name", owner: "Owner", limit: "Limit" }, data);
        this._bot.respond(message, messages);
    }

    @Command("enable {module}")
    @Command("enable module {module}")
    @CommandSample("enable __*module name*__")
    @CommandDescription("Enables a module for this server.")
    @CommandPermission("MANAGE_MODULES")
    private handleEnableModule(message: MessageInterface, args: { [key: string]: any }) {
        if (this._bot.getModule(args.module) === null)
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_INVALID"), { author: message.author.id, module: args.module }));

        if (message.server.isModuleEnabled(args.module))
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_ALREADY_ENABLED"), { author: message.author.id, module: args.module }));

        message.server.enableModule(args.module);
        return this._bot.respond(message, StringFormat(Responses.get("MODULE_ENABLED"), { author: message.author.id, module: args.module }));
    }

    @Command("disable {module}")
    @Command("disable module {module}")
    @CommandSample("disable __*module name*__")
    @CommandDescription("Disables a module for this server.")
    @CommandPermission("MANAGE_MODULES")
    private handleDisableModule(message: MessageInterface, args: { [key: string]: any }) {
        let module = this._bot.getModule(args.module);
        if (module === null)
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_INVALID"), { author: message.author.id, module: args.module }));

        if (!message.server.isModuleEnabled(args.module))
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_NOT_ENABLED"), { author: message.author.id, module: args.module }));

        if (module.alwaysOn)
            return this._bot.respond(message, StringFormat(Responses.get("MODULE_ALWAYS_ON"), { author: message.author.id, module: args.module }));

        message.server.disableModule(args.module);
        return this._bot.respond(message, StringFormat(Responses.get("MODULE_DISABLED"), { author: message.author.id, module: args.module }));
    }

    @Command("list modules")
    @Command("show modules")
    @CommandSample("list modules")
    @CommandDescription("Lists all available modules.")
    @CommandPermission("MANAGE_MODULES")
    private handleListModules(message: MessageInterface, args: { [key: string]: any }) {
        let columns = { name: "Name", enabled: "Enabled", flags: "Flags" };
        let data = [];

        for (let key in this._bot.modules) {
            let enabled = message.server.isModuleEnabled(key);
            let always_on = this._bot.modules[key].alwaysOn;
            let default_on = this._bot.modules[key].defaultOn;
            let hidden = this._bot.modules[key].hidden;

            if (hidden)
                continue;

            let flags = "";
            if (always_on)
                flags += "always_on";

            if (default_on)
                flags += flags.length === 0 ? "default_on" : " default_on";

            data.push({ name: key, enabled: (enabled) ? "yes" : "no", flags: flags });
        }

        let messages = GenerateTable(StringFormat(Responses.get("MODULE_LIST"), { author: message.author.id }), columns, data, { name: 20, enabled: 10, flags: 15 });
        this._bot.respond(message, messages);
    }

    @Command("assign role {role} to user {userid!user}")
    @Command("assign {role} to user {userid!user}")
    @Command("assign role {role} to {userid!user}")
    @Command("assign {role} to {userid!user}")
    @Command("assign {role} {userid!user}")
    @CommandSample("assign __*role*__ to __*@user*__")
    @CommandDescription("Assigns the specified role to the specified user.")
    @CommandPermission("ASSIGN_ROLES")
    private handleAssignRole(message: MessageInterface, args: { [key: string]: any }) {
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role)
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        let user = Users.getUser(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        if (user.getRole(message.server) === args.role)
            return this._bot.respond(message, StringFormat(Responses.get("ROLE_ALREADY_ASSIGNED"), { author: message.author.id, role: args.role, user: args.user }));

        if (!Users.assignRole(user._userID, message.server, args.role))
            return this._bot.respond(message, StringFormat(Responses.get("ERROR"), { author: message.author.id }));

        return this._bot.respond(message, StringFormat(Responses.get("ROLE_ASSIGNED"), { author: message.author.id, role: args.role, user: args.user }));
    }

    @Command("add permission {permission} to role {role}")
    @Command("add {permission} to role {role}")
    @Command("add permission {permission} to {role}")
    @Command("add {permission} {role}")
    @CommandSample("add __*permission*__ to __*role*__")
    @CommandDescription("Adds the specified permission to the specified role.")
    @CommandPermission("MANAGE_PERMISSIONS")
    private handleAddPermission(message: MessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role)
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        if (!this._permissions.isAllowed(args.permission, message.user.getRole(message.server), message.server))
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        this._permissions.add(args.permission, args.role, message.server);
        this._bot.respond(message, StringFormat(Responses.get("ADDED_PERMISSION"), { author: message.author.id, permission: args.permission, role: args.role }));
    }

    @Command("remove permission {permission} from role {role}")
    @Command("remove {permission} from role {role}")
    @Command("remove permission {permission} from {role}")
    @Command("remove {permission} {role}")
    @CommandSample("remove __*permission*__ from __*role*__")
    @CommandDescription("Removes the specified permission from the specified role.")
    @CommandPermission("MANAGE_PERMISSIONS")
    private handleRemovePermission(message: MessageInterface, args: { [key: string]: any }) {
        args.permission = args.permission.toUpperCase();
        args.role = args.role.toLowerCase();

        let role_id = 0;
        switch (args.role) {
            case "superadmin":
                return this._bot.respond(message, StringFormat(Responses.get("INVALID_ROLE"), { author: message.author.id, role: args.role }));

            case "admin":
                role_id = 1;
                break;

            case "moderator":
                role_id = 2;
                break;

            default:
                role_id = 3;
                break;
        }

        let my_role = message.user.getRoleId(message.server);
        if (role_id < my_role)
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        if (!this._permissions.isAllowed(args.permission, message.user.getRole(message.server), message.server))
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        this._permissions.remove(args.permission, args.role, message.server);
        this._bot.respond(message, StringFormat(Responses.get("REMOVED_PERMISSION"), { author: message.author.id, permission: args.permission, role: args.role }));
    }

    @Command("ignore {userid!user}")
    @Command("start ignoring {userid!user}")
    @CommandSample("ignore __*@user*__")
    @CommandDescription("Ignores the specified user.")
    @CommandPermission("IGNORE_USERS")
    private handleIgnoreUser(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUserById(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        if (message.user.getRoleId(message.server) >= user.getRoleId(message.server))
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        message.server.ignoreUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("STARTED_IGNORING"), { author: message.author.id, user: user._userID }));
    }

    @Command("unignore {userid!user}")
    @Command("stop ignoring {userid!user}")
    @CommandSample("unignore __*@user*__")
    @CommandDescription("Stops ignoring the specified user.")
    @CommandPermission("IGNORE_USERS")
    private handleUnignoreUser(message: MessageInterface, args: { [key: string]: any }) {
        let user = Users.getUserById(args.user, message.server);
        if (user === null)
            return this._bot.respond(message, StringFormat(Responses.get("INVALID_USER"), { author: message.author.id, user: args.user }));

        if (message.user.getRoleId(message.server) >= user.getRoleId(message.server))
            return this._bot.respond(message, StringFormat(Responses.get("NOT_ALLOWED"), { author: message.author.id }));

        message.server.unignoreUser(user);
        return this._bot.respond(message, StringFormat(Responses.get("STOPPED_IGNORING"), { author: message.author.id, user: user._userID }));
    }
}
