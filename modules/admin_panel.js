"use strict";

const IModule = require("../src/IModule.js");
const permissions = require("../src/permissions.js");
const responses = require("../src/responses.js");
const users = require("../src/users.js");
const Util = require("../src/util.js");
const config = require("../config.js");

var app = require("express");
var exp = app();
var nunjucks = require("nunjucks");
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5



class AdminPanel extends IModule {
    constructor() {
        super();
        this.sessions = [];

        //Configure nunjucks to use express
        nunjucks.configure("views", {
            autoescape: true,
            express: exp
        });
        //Listen to port 80
        exp.listen(80, function() {
            console.log("Admin panel is running");
        });
        //Add express libraries to Express
        exp.use(cookieParser());
        exp.use(bodyParser.json());
        exp.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
        /*
        Handle all the pages
         */

        /*
        Dashboard
         */
        exp.get("/", function(req, res) {
            this._handleIndex(req, res);
        }.bind(this));

        /*
        Login
         */
        exp.get("/login", function(req, res) {
            this._handleLogin(req, res);
        }.bind(this));

        exp.post("/login", function(req, res) {
            this._handleLogin(req, res);
        }.bind(this));

        /*
        Logout
         */

        exp.get("/logout", function(req, res) {
            this._handleLogout(req, res);
        }.bind(this));

        /*
        Expose libraries for pages
         */
        exp.use('/vendor', app.static('vendor'));
        exp.use('/dist', app.static("dist"));
    }

    /*
    Page handlers
     */

    _handleIndex(req, res, loggedin) {

        if ((typeof loggedin === "undefined" || !loggedin)) {
            if (typeof req.cookies === "undefined") {
                res.render("login.html");
                return;
            }

            if (typeof req.cookies.session === "undefined") {
                res.render("login.html");
                return;
            }
        }

        if (!loggedin) {
            console.log("req.cookies: ", req.cookies);
            console.log("this.sessions: ", this.sessions);
            var session = req.cookies.session;
            if (this.sessions.indexOf(session) === -1) {
                res.render("login.html");
                return;
            }
        }

        res.render("index.html");
    }

    _handleLogin(req, res) {
        var params = req.body;
        console.log(params);
        if (typeof req.cookies !== "undefined") {
            if (typeof req.cookies.session !== "undefined") {
                res.render("index.html");
                return;
            }
        }

        if (typeof params === "undefined") {
            res.render("login.html");
            return;
        }


        if (typeof params.username === "undefined" || typeof params.password === "undefined") {
            res.render("login.html");
            return;
        }

        if (params.username === config.adminusername && params.password === config.adminpassword) {
            var session = this.create_session();
            this.sessions.push(session);
            console.log(this.sessions);
            res.cookie("session", session);
            this._handleIndex(req, res, true);
        } else {
            res.render("login.html");
        }
    }

    _handleLogout(req, res) {
        if (typeof req.cookies === "undefined") {
            if (typeof req.cookies.session === "undefined") {
                res.render("login.html");
                return;
            }
        }

        var index = this.sessions.indexOf(req.cookies.session);
        if (index !== -1)
            this.sessions.splice(index, 1);

        res.clearCookie("session");
        res.render("login.html");
    }

    /*
    Abstract
     */
    on_setup(bot)
    {
        this.bot = bot;
    }

    on_load()
    {
    }

    on_unload()
    {
    }

    create_session()
    {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 32; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
}

module.exports = new AdminPanel();