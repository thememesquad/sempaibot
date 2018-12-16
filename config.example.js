//----- Config
module.exports = {
    Config: {
        identifiers: ["sempai ", "-"],

        discord: {
            token: "bot_account_login_token",
        },

        osu: {
            apikey: "osu_api_key",
            apiurl: "custom_api_url",    //optional: defaults to the official osu api url. Will still use the official osu api for beatmap info.
        },

        superadmins: [
            "discord_user_id"             //can be retrieved by typing \@discord_name in discord
        ]
    }
};