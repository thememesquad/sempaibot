module.exports = {
    get_user: function(name, bot){
        for (var i = 0; i < bot.discord.users.length; i++) {
            var user = bot.discord.users[i];
            if (user.username === name) {
                return user.id;
            }
        }

        return -1;
    }
};