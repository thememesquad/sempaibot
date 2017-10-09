import * as moment from "moment";
import { ITimeInterface } from "./timeinterface";

function parseTimeInternal(str): ITimeInterface {
    str = str.toLowerCase().trim();

    const currentDate = moment();

    let base;
    let time;
    const dayFunc = (target, day: string) => {
        const current = currentDate.day();

        if (current === target)
            return null;

        let num = 0;
        if (current > target)
            num = ((target + 6) - current) + 1;
        else
            num = target - current;

        base = "on " + day;
        time = currentDate.add(num, "days");

        return { base, time };
    };

    const match = str.trim().split(" ");
    switch (match[0]) {
        case "monday":
            return dayFunc(1, "monday");

        case "tuesday":
            return dayFunc(2, "tuesday");

        case "wednesday":
            return dayFunc(3, "wednesday");

        case "thursday":
            return dayFunc(4, "thursday");

        case "friday":
            return dayFunc(5, "friday");

        case "saturday":
            return dayFunc(6, "saturday");

        case "sunday":
            return dayFunc(0, "sunday");

        case "tomorrow":
            base = "tomorrow";
            time = currentDate.add(1, "day");

            return { base, time };
    }

    if (match.length === 2) {
        let num;
        let name;

        switch (match[1]) {
            case "second":
            case "seconds":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown second: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " second";
                    else
                        name += " seconds";

                    base = "in " + name;
                    time = moment(currentDate.unix() + (num * 1000));

                    return { base, time };
                }

            case "minute":
            case "minutes":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown minute: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " minute";
                    else
                        name += " minutes";

                    base = "in " + name;
                    time = currentDate.add(num, "minutes");

                    return { base, time };
                }

            case "hour":
            case "hours":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown hour: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " hour";
                    else
                        name += " hours";

                    base = "in " + name;
                    time = currentDate.add(num, "hours");

                    return { base, time };
                }

            case "day":
            case "days":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown day: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " day";
                    else
                        name += " days";

                    base = "in " + name;
                    time = currentDate.add(num, "days");

                    return { base, time };
                }

            case "week":
            case "weeks":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        switch (match[0]) {
                            case "next":
                                num = 1;
                                break;

                            default:
                                console.log("Unknown week: " + match[0]);
                                return null;
                        }
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " week";
                    else
                        name += " weeks";

                    base = "in " + name;
                    time = currentDate.add(num, "weeks");

                    return { base, time };
                }

            case "month":
            case "months":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown month: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " month";
                    else
                        name += " months";

                    base = "in " + name;
                    time = currentDate.add(num, "months");

                    return { base, time };
                }

            case "year":
            case "years":
                {
                    num = parseInt(match[0], 10);
                    if (isNaN(num)) {
                        console.log("Unknown year: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " year";
                    else
                        name += " years";

                    base = "in " + name;
                    time = currentDate.add(num, "years");

                    return { base, time };
                }
        }
    }

    time = moment(str, [
        "YYYY-MM-DD HH:mm",
        "HH:mm",
        "YYYY-MM-DD",
        "DD MMMM YYYY",
        "D MMMM YYYY",
        "Do MMMM YYYY",
        "MMMM DD YYYY",
        "MMMM D YYYY",
        "MMMM Do YYYY",
        "YYYY MMMM DD",
        "YYYY MMMM D",
        "YYYY MMMM Do",
    ], true);

    base = time.calendar();

    return { base, time };
}

export function parseTime(str) {
    let ret = [];
    const split = str.trim().split(" ");

    let size = split.length;
    while (size > 1) {
        const matches = [];

        for (let i = 0; i < split.length; i++) {
            let tmp = "";
            let full = true;

            for (let j = 0; j < size; j++) {
                if (i + j >= split.length) {
                    full = false;
                    break;
                }

                if (j !== 0)
                    tmp += " ";

                tmp += split[i + j];
            }

            if (!full) {
                continue;
            }

            const tmp2 = parseTimeInternal(tmp);
            if (tmp2 === null || !tmp2[1].isValid()) {
                continue;
            }

            const index = str.indexOf(tmp);
            matches.push({
                index,
                ret: tmp2,
                str: tmp,
            });
        }

        ret = ret.concat(matches);
        size--;
    }

    return ret;
}
