export function stringFormat(str: string, args: { [key: string]: any } = null): string {
    if (args == null) {
        return str;
    }

    return str.replace(/{(.*?)}/g, (match, key) => {
        return typeof args[key] !== "undefined" ? args[key] : match;
    });
}
