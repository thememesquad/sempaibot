//----- Config
module.exports = {
    token: "bot_account_login_token",
    use_mongodb: true,                //optional: defaults to true
    osu_api: "osu_api_key",
    osu_api_url: "custom_api_url",    //optional: defaults to the official osu api url. Will still use the official osu api for beatmap info.

    adminusername: "adminusername",
    adminpassword: "adminpassword",

    superadmins: [
        "discord_user_id"             //can be retrieved by typing \@discord_name in discord
    ]
};