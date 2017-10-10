class Config {
    set(props) {
        for (let key in props)
            this[key] = props[key];
    }
}

module.exports = new Config();