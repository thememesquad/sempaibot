module.exports = {
    "undefined": (tmp) => {
        return typeof tmp === "undefined";
    },
    "defined": (tmp) => {
        return typeof tmp !== "undefined";
    },
    "null": (tmp) => {
        return tmp === null;
    }
};