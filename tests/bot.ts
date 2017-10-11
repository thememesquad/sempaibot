import * as chai from "chai";
import "mocha";
import { NullAPI } from "../src/api/nullapi";
import { Bot } from "../src/core/bot";

chai.should();

describe("Bot", () => {
    it("constructor", (done) => {
        const bot = new Bot(new NullAPI());
        done();
    });
});
