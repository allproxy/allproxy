const sample = function (preJSONString, jsonObject) {
    let date = new Date();
    let level = jsonObject && jsonObject.level ? jsonObject.level : 'info';
    let category = '';
    let message = '';
    if (jsonObject.MESSAGE) message = jsonObject.MESSAGE;
    else if (jsonObject.message) message = jsonObject.message;
    else if (jsonObject.msg) message = jsonObject.msg;

    function parsePod(pod) {
        const podParts = pod.split('-');
        if (podParts.length > 1) {
            podParts.pop();
        }
        return podParts.join('-');
    }

    if (jsonObject._file) {
        if (jsonObject.msg_timestamp) {
            date = new Date(jsonObject.msg_timestamp);
        } else if (jsonObject._ts) {
            date = new Date(jsonObject._ts);
        }

        if (jsonObject.pod) {
            category = parsePod(jsonObject.pod);
        } else if (jsonObject._file) {
            if (jsonObject._host) {
                category = jsonObject._host + ' ';
            }
            category += parsePod(jsonObject._file);
        }
    } else {
        const tokens = preJSONString.split(' ', 5);
        if (tokens.length >= 3) {
            date = new Date(tokens.slice(0, 3).join(' '));
        }
        if (jsonObject.msg_timestamp) {
            date = new Date(jsonObject.msg_timestamp);
        } else if (jsonObject._ts) {
            date = new Date(jsonObject._ts);
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
    if (jsonObject.Worker !== undefined) {
        category += ' worker' + jsonObject.Worker;
    }

    let additionalJSON = {};

    if (Object.keys(jsonObject).length === 0) {
        const i = preJSONString.indexOf('verb=');
        if (i !== -1) {
            const keyValues = preJSONString.substring(i).split(' ');
            for (const kv of keyValues) {
                const parts = kv.split('=');
                additionalJSON[parts[0]] = parts[1];
            }
        }
    } else if (category.indexOf('sys.journal') !== -1 && jsonObject.message !== undefined) {
        additionalJSON = JSON.parse(jsonObject.message);
        if (additionalJSON.msg !== undefined) message = additionalJSON.msg;
    }

    return { date, level, category, message, additionalJSON };
}
