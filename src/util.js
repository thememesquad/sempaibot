module.exports = {
    get_user: function(name, Bot){
        for (var i = 0; i < Bot.discord.users.length; i++) {
            var user = Bot.discord.users[i];
            if (user.username === name) {
                return user.id;
            }
        }

        return -1;
    }
};