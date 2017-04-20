"use strict";

let chai = require("chai");

chai.should();

let Util = require("../src/util.js");

describe("Util", () => {
    describe("parse_id", () => {
        it("parse user id", () => {
            let ret = Util.parse_id("<@1234>");
            
            ret.type.should.equal("user");
            ret.id.should.equal("1234");
            ret.alias.should.equal(false);
        });
        
        it("parse channel id", () => {
            let ret = Util.parse_id("<#1234>");
            
            ret.type.should.equal("channel");
            ret.id.should.equal("1234");
            ret.alias.should.equal(false);
        });
        
        it("parse alias user id", () => {
            let ret = Util.parse_id("<@!1234>");
            
            ret.type.should.equal("user");
            ret.id.should.equal("1234");
            ret.alias.should.equal(true);
        });
        
        it("parse unknown", () => {
            let ret = Util.parse_id("hello world");
            
            ret.type.should.equal("unknown");
            ret.id.should.equal("hello world");
            ret.alias.should.equal(false);
        });
        
        it("parse unknown low-length", () => {
            let ret = Util.parse_id("tmp");
            
            ret.type.should.equal("unknown");
            ret.id.should.equal("tmp");
            ret.alias.should.equal(false);
        });
    });
    
    describe("generate_table", () => {
        it("null base_message", () => {
            let ret = Util.generate_table(null, {tmp: "tmp"}, [{tmp: "hello world"}]);
            
            ret.length.should.equal(0);
        });
        
        it("null columns", () => {
            let ret = Util.generate_table("hello", null, [{tmp: "world"}]);
            
            ret.length.should.equal(1);
        });
        
        it("null data", () => {
            let ret = Util.generate_table("hello", {world: "!"}, null);
            
            ret.length.should.equal(0);
        });
        
        it("empty data", () => {
            let ret = Util.generate_table("hello", {world: "!"}, []);
            
            ret.length.should.equal(0);
        });
        
        it("normal data", () => {
            let ret = Util.generate_table("hello", {world: "!"}, [
                {world: "tmp"}
            ]);
            ret.length.should.equal(1);
        });
        
        it("too much data", () => {
            let data = [];
            let num = (Math.ceil((1800 - "hello```world\r\n".length) / "tmp\r\n".length) + 2) * 2;
            
            for(let i = 0;i<num;i++)
            {
                data.push({world: "tmp"});
            }
            
            let ret = Util.generate_table("hello", {world: "!"}, data);
            ret.length.should.equal(2);
        });
        
        it("way too much data", () => {
            let data = [];
            let num = Math.ceil((1800 - "hello world".length) / "tmp".length) * 4;
            
            for(let i = 0;i<num;i++)
            {
                data.push({world: "tmp"});
            }
            
            let ret = Util.generate_table("hello", {world: "!"}, data);
            ret.length.should.equal(7);
        });
        
        it("way too much data minimum_length", () => {
            let data = [];
            let num = Math.ceil((1800 - "hello world".length) / "tmp".length) * 4;
            
            for(let i = 0;i<num;i++)
            {
                data.push({world: "tmp"});
            }
            
            let ret = Util.generate_table("hello", {world: "!"}, data, {world: 1});
            ret.length.should.equal(7);
        });
    });
});