import { add } from "lodash";

function sample(nonJson, jsonData) {
    let date = new Date();
    let level = jsonData && jsonData.level ? jsonData.level : 'info';
    let category = '';
    let message = '';
    if (jsonData.MESSAGE) message = jsonData.MESSAGE;
    else if (jsonData.message) message = jsonData.message;
    else if (jsonData.msg) message = jsonData.msg;

    function parsePod(pod) {
        const podParts = pod.split('-');
        if (podParts.length > 1) {
            podParts.pop();
        }
        return podParts.join('-');
    }

    if (jsonData._file) {
        if (jsonData.msg_timestamp) {
            date = new Date(jsonData.msg_timestamp);
        } else if (jsonData._ts) {
            date = new Date(jsonData._ts);
        }

        if (jsonData.pod) {
            category = parsePod(jsonData.pod);
        } else if (jsonData._file) {
            if (jsonData._host) {
                category = jsonData._host + ' ';
            }
            category += parsePod(jsonData._file);
        }
    } else {
        const tokens = nonJson.split(' ', 5);
        if (tokens.length >= 3) {
            date = new Date(tokens.slice(0, 3).join(' '));
        }
        if (jsonData.msg_timestamp) {
            date = new Date(jsonData.msg_timestamp);
        } else if (jsonData._ts) {
            date = new Date(jsonData._ts);
        }
        if (tokens.length >= 4) {
            let pod = tokens[3];
            if (pod.startsWith('mzone')) {
                if (tokens.length >= 5) {
                    pod = tokens[4];
                    category = tokens[3] + ' ';
                }
            }
            category += parsePod(pod);
        }
    }
    if (jsonData.Worker !== undefined) {
        category += ' worker' + jsonData.Worker;
    }

    let additionalJSON = {};

    if (Object.keys(jsonData).length === 0) {
        const i = nonJson.indexOf('verb=');
        if (i !== -1) {
            const keyValues = nonJson.substring(i).split(' ');
            for (const kv of keyValues) {
                const parts = kv.split('=');
                additionalJSON[parts[0]] = parts[1];
            }
        }
    } else if (category.indexOf('sys.journal') !== -1 && jsonData.message !== undefined) {
        additionalJSON = JSON.parse(jsonData.message);
        if (additionalJSON.msg !== undefined) message = additionalJSON.msg;
    }

    return { date, level, category, message, additionalJSON };
}
