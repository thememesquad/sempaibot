"use strict";

require("./Setup.js");
let CamoMock = require("./CamoMock.js");
let config = require("../config.js");
let db = require("../src/db.js");

describe("db", () => {
    it("mongodb all set", () => {
        config.set({
            use_mongodb: true,
            db_database: "testdatabase",
            db_username: "testusername",
            db_password: "testpassword",
            db_host: "testhost",
            db_port: "testport",
            db_name: "testname"
        });
        
        return db.load({log: function(){}}).should.eventually.equal("mongodb");
    });
    
    it("mongodb no database set", () => {
        config.set({
            use_mongodb: true,
            db_database: null,
            db_username: "testusername",
            db_password: "testpassword",
            db_host: "testhost",
            db_port: "testport",
            db_name: "testname"
        });
        
        return db.load({log: function(){}}).should.eventually.equal("mongodb");
    });
    
    it("mongodb fail", () => {
        config.set({
            use_mongodb: true,
            db_database: null,
            db_username: "testusername",
            db_password: "testpassword",
            db_host: "testhost",
            db_port: "testport",
            db_name: "testname"
        });
        
        CamoMock.failMongoDB = true;
        return db.load({log: function(){}}).should.eventually.equal("nedb");
    });
    
    it("mongodb nedb fail", () => {
        config.set({
            use_mongodb: true,
            db_database: null,
            db_username: "testusername",
            db_password: "testpassword",
            db_host: "testhost",
            db_port: "testport",
            db_name: "testname"
        });
        
        CamoMock.failMongoDB = true;
        CamoMock.failNeDB = true;
        
        return db.load({log: function(){}}).should.be.rejected;
    });
    
    it("nedb", () => {
        config.set({
            use_mongodb: false
        });
        
        CamoMock.failMongoDB = false;
        CamoMock.failNeDB = false;
        return db.load({log: function(){}}).should.eventually.equal("nedb");
    });
    
    it("nedb fail", () => {
        config.set({
            use_mongodb: false
        });
        
        CamoMock.failMongoDB = false;
        CamoMock.failNeDB = true;
        return db.load({log: function(){}}).should.be.rejected;
    });
    
    describe("ConfigKeyValue", () => {
        it("basic find", () => {
            return db.ConfigKeyValue.find({}).should.eventually.have.property("length");
        });
        
        it("basic create", () => {
            var c = db.ConfigKeyValue.create({key: "testkey", value: "testval"});
            c.key.should.equal("testkey");
            c.value.should.equal("testval");
        });
    });
});