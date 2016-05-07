//----- Config
var process = require("process");
module.exports = {
	user: "info@semwong.com",
	pass: "0nlyS3mKn0ws",
	server: "https://discord.gg/0jJ7kVQNcmLdY6aO",
	osuapi: "a8f348302f1c7ecc7167a0a1c80233a69171974a",
	db_username: "admin",
	db_password: "YMHthrNBafJd",
	db_host: process.env.OPENSHIFT_MONGODB_DB_HOST,
	db_port: process.env.OPENSHIFT_MONGODB_DB_PORT
}; 