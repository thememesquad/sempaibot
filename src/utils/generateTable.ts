export function generateTable(baseMessage: string | null, columns: { [key: string]: string }, data: { [key: string]: any }[], minimumLengths: { [key: string]: number } | null = null): string[] {
    if (baseMessage === null || baseMessage === undefined) {
        return [];
    }

    if (data === null || data === undefined) {
        return [];
    }

    if (columns === null || columns === undefined) {
        columns = {};

        for (const dat of data) {
            for (const key in dat) {
                columns[key] = key;
            }
        }
    }

    const lengths: { [key: string]: number } = {};

    for (const key in columns) {
        if (minimumLengths !== null) {
            lengths[key] = Math.max(columns[key].length, minimumLengths[key]);
        } else {
            lengths[key] = columns[key].length;
        }
    }

    for (const dat of data) {
        for (const key in columns) {
            lengths[key] = Math.max(dat[key].length, lengths[key]);
        }
    }

    for (const key in columns) {
        lengths[key] += 2;
    }

    let message = "";

    const writeHeaders = () => {
        for (const key in columns) {
            let val = columns[key];

            while (val.length !== lengths[key]) {
                val += " ";
            }

            message += val;
        }

        message = message.trim();
        message += "\r\n";
    };

    const writeItem = (index: number) => {
        let tmp = "";
        for (const key in columns) {
            let val = data[index][key];
            while (val.length !== lengths[key]) {
                val += " ";
            }

            tmp += val;
        }

        tmp = tmp.replace(/\s+$/gm, "");
        tmp += "\r\n";

        message += tmp;
    };

    const messages = [];
    if (data.length === 0) {
        message = "```";
        writeHeaders();
        message += "No data available\r\n";
    } else {
        for (let i = 0; i < data.length; i++) {
            if (message.length === 0) {
                message = "```";
                writeHeaders();
            }

            writeItem(i);

            if (message.length >= 1800) {
                message += "```";
                messages.push(message);
                message = "";
            }
        }
    }

    if (message.length !== 0) {
        message += "```";
        messages.push(message);
    }

    messages[0] = baseMessage + " " + messages[0];
    return messages;
}
