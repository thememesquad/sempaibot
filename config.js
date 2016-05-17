//----- Config
var process = require("process");
module.exports = {
	token: "MTgyMTE0MjE0ODU1NDQyNDMz.ChymlA.oWGl3VC4GgIN8MRREk7pmycdZjM",
	osu_api: "a8f348302f1c7ecc7167a0a1c80233a69171974a",
	osu_irc_username: "calsmurf2904",
	osu_irc_password: "077bec43",
	db_username: "admin",
	db_password: "YMHthrNBafJd",
	db_host: process.env.OPENSHIFT_MONGODB_DB_HOST,
	db_port: process.env.OPENSHIFT_MONGODB_DB_PORT,
	
	superadmins: [
		"110525719133577216",
		"130959661502300160",
		"130423011483320320"
	]
}; 