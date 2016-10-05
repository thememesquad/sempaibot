"use strict";

let mockery = require("mockery");
let chai = require("chai");
let chaiAsPromised = require("chai-as-promised");
let Q = require("q");
let CamoMock = require("./CamoMock.js");
let DiscordMock = require("./DiscordMock.js");
 
chai.use(chaiAsPromised);
chai.should();

mockery.enable();
mockery.warnOnUnregistered(false);

mockery.registerSubstitute("camo", __dirname + "/CamoMock.js");
mockery.registerSubstitute("discord.js", __dirname + "/DiscordMock.js");
mockery.registerSubstitute("../config.js", __dirname + "/ConfigMock.js");
mockery.registerSubstitute("../../config.js", __dirname + "/ConfigMock.js");