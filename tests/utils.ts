import * as chai from "chai";
import "mocha";
import { RoleType } from "../src/core/permission/roletype";
import { generateTable } from "../src/core/utils/generatetable";
import { IdType } from "../src/core/utils/idtype";
import { parseId } from "../src/core/utils/parseid";
import { parseRoleType } from "../src/core/utils/parseroletype";
import { parseTime } from "../src/core/utils/parsetime";
import { stringFormat } from "../src/core/utils/stringformat";

chai.should();

describe("Util", () => {
    describe("parse_id", () => {
        it("parse user id", () => {
            const ret = parseId("<@1234>");

            ret.type.should.equal(IdType.User);
            ret.id.should.equal("1234");
            ret.alias.should.equal(false);
        });

        it("parse channel id", () => {
            const ret = parseId("<#1234>");

            ret.type.should.equal(IdType.Channel);
            ret.id.should.equal("1234");
            ret.alias.should.equal(false);
        });

        it("parse alias user id", () => {
            const ret = parseId("<@!1234>");

            ret.type.should.equal(IdType.User);
            ret.id.should.equal("1234");
            ret.alias.should.equal(true);
        });

        it("parse unknown", () => {
            const ret = parseId("hello world");

            ret.type.should.equal(IdType.Unknown);
            ret.id.should.equal("hello world");
            ret.alias.should.equal(false);
        });

        it("parse unknown low-length", () => {
            const ret = parseId("tmp");

            ret.type.should.equal(IdType.Unknown);
            ret.id.should.equal("tmp");
            ret.alias.should.equal(false);
        });
    });

    describe("parse role type", () => {
        it("superadmin", () => {
            const role = parseRoleType("superadmin");

            role.should.equal(RoleType.SuperAdmin);
        });

        it("superadmin random caps", () => {
            const role = parseRoleType("sUpErAdmiN");

            role.should.equal(RoleType.SuperAdmin);
        });

        it("admin", () => {
            const role = parseRoleType("admin");

            role.should.equal(RoleType.Admin);
        });

        it("admin random caps", () => {
            const role = parseRoleType("AdmiN");

            role.should.equal(RoleType.Admin);
        });

        it("moderator", () => {
            const role = parseRoleType("moderator");

            role.should.equal(RoleType.Moderator);
        });

        it("moderator random caps", () => {
            const role = parseRoleType("mOdeRatoR");

            role.should.equal(RoleType.Moderator);
        });

        it("normal", () => {
            const role = parseRoleType("normal");

            role.should.equal(RoleType.Normal);
        });

        it("normal random caps", () => {
            const role = parseRoleType("noRmAl");

            role.should.equal(RoleType.Normal);
        });

        it("unknown", () => {
            const role = parseRoleType("helloworld");

            role.should.equal(RoleType.Normal);
        });
    });

    describe("string format", () => {
        it("no format 1", () => {
            const str = stringFormat("Hello World");
            str.should.equal("Hello World");
        });

        it("no format 2", () => {
            const str = stringFormat("Hello {World}", {});
            str.should.equal("Hello {World}");
        });

        it("format", () => {
            const str = stringFormat("Hello {world}", {world: "World"});
            str.should.equal("Hello World");
        });

        it("null format", () => {
            const str = stringFormat("Hello World", null);
            str.should.equal("Hello World");
        });
    });

    describe("parse time", () => {
        it("basic", () => {
            const tmp = parseTime("today");
            tmp.length.should.equal(1);
            tmp[0].ret.base.should.equal("today");
            tmp[0].ret.time.isValid().should.equal(true);
        });
    });

    describe("generate table", () => {
        it("null base_message", () => {
            const data = [];
            data.push({ tmp: "hello world" });

            const ret = generateTable(null, { tmp: "tmp" }, data);

            ret.length.should.equal(0);
        });

        it("null columns", () => {
            const data = [];
            data.push({ tmp: "world" });

            const ret = generateTable("hello", null, data);

            ret.length.should.equal(1);
        });

        it("null data", () => {
            const ret = generateTable("hello", { world: "!" }, null);

            ret.length.should.equal(0);
        });

        it("empty data", () => {
            const ret = generateTable("hello", { world: "!" }, []);

            ret.length.should.equal(1);
        });

        it("normal data", () => {
            const data = [];
            data.push({ world: "tmp" });

            const ret = generateTable("hello", { world: "!" }, data);
            ret.length.should.equal(1);
        });

        it("too much data", () => {
            const data = [];
            const num = (Math.ceil((1800 - "hello```world\r\n".length) / "tmp\r\n".length) + 2) * 2;

            for (let i = 0; i < num; i++) {
                data.push({ world: "tmp" });
            }

            const ret = generateTable("hello", { world: "!" }, data);
            ret.length.should.equal(2);
        });

        it("way too much data", () => {
            const data = [];
            const num = Math.ceil((1800 - "hello world".length) / "tmp".length) * 4;

            for (let i = 0; i < num; i++) {
                data.push({ world: "tmp" });
            }

            const ret = generateTable("hello", { world: "!" }, data);
            ret.length.should.equal(7);
        });

        it("way too much data minimum_length", () => {
            const data = [];
            const num = Math.ceil((1800 - "hello world".length) / "tmp".length) * 4;

            for (let i = 0; i < num; i++) {
                data.push({ world: "tmp" });
            }

            const ret = generateTable("hello", { world: "!" }, data, { world: 1 });
            ret.length.should.equal(7);
        });
    });
});
