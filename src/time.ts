import * as moment from "moment";

interface TimeObject {
    base: string;
    time: moment.Moment;
}

function ParseTimeInternal(str): TimeObject {
    str = str.toLowerCase().trim();

    let currentDate = moment();

    let day_func = (target, day:string) => {
        let current = currentDate.day();

        if (current === target)
            return null;

        let num = 0;
        if (current > target)
            num = ((target + 6) - current) + 1;
        else
            num = target - current;

        let base = "on " + day;
        let time = currentDate.add(num, "days");

        return { base, time };
    };

    let match = str.trim().split(" ");
    switch (match[0]) {
        case "monday":
            return day_func(1, "monday");

        case "tuesday":
            return day_func(2, "tuesday");

        case "wednesday":
            return day_func(3, "wednesday");

        case "thursday":
            return day_func(4, "thursday");

        case "friday":
            return day_func(5, "friday");

        case "saturday":
            return day_func(6, "saturday");

        case "sunday":
            return day_func(0, "sunday");

        case "tomorrow":
            let base = "tomorrow";
            let time = currentDate.add(1, "day");

            return { base, time };
    }

    if (match.length === 2) {
        let num, name;

        switch (match[1]) {
            case "second":
            case "seconds":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown second: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " second";
                    else
                        name += " seconds";

                    let base = "in " + name;
                    let time = moment(currentDate.unix() + (num * 1000));

                    return { base, time };
                }

            case "minute":
            case "minutes":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown minute: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " minute";
                    else
                        name += " minutes";

                    let base = "in " + name;
                    let time = currentDate.add(num, "minutes");

                    return { base, time };
                }

            case "hour":
            case "hours":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown hour: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " hour";
                    else
                        name += " hours";

                    let base = "in " + name;
                    let time = currentDate.add(num, "hours");

                    return { base, time };
                }

            case "day":
            case "days":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown day: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " day";
                    else
                        name += " days";

                    let base = "in " + name;
                    let time = currentDate.add(num, "days");

                    return { base, time };
                }

            case "week":
            case "weeks":
                {
                    num = parseInt(match[0]);
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

                    let base = "in " + name;
                    let time = currentDate.add(num, "weeks");

                    return { base, time };
                }

            case "month":
            case "months":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown month: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " month";
                    else
                        name += " months";

                    let base = "in " + name;
                    let time = currentDate.add(num, "months");

                    return { base, time };
                }

            case "year":
            case "years":
                {
                    num = parseInt(match[0]);
                    if (isNaN(num)) {
                        console.log("Unknown year: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if (num === 1)
                        name += " year";
                    else
                        name += " years";

                    let base = "in " + name;
                    let time = currentDate.add(num, "years");

                    return { base, time };
                }
        }
    }

    let time = moment(str, [
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
        "YYYY MMMM Do"
    ], true);
    let base = time.calendar();

    return { base, time };
}

export function ParseTime(str) {
    let ret = [];
    let split = str.trim().split(" ");

    let size = split.length;
    while (size > 1) {
        let matches = [];

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

            let tmp2 = ParseTimeInternal(tmp);
            if (tmp2 === null || !tmp2[1].isValid()) {
                continue;
            }

            let index = str.indexOf(tmp);
            matches.push({ index: index, str: tmp, ret: tmp2 });
        }

        ret = ret.concat(matches);
        size--;
    }

    return ret;
}