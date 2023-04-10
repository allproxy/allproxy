function sample(nonJson, jsonData) {
    let date = '';
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
        let d;
        if (jsonData.msg_timestamp) {
            d = new Date(jsonData.msg_timestamp);
        } else if (jsonData._ts) {
            d = new Date(jsonData._ts);
        }
        date = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0') + '.' + d.getMilliseconds();

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
            date = tokens[2];
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

    const additionalJSON = {};

    if (Object.keys(jsonData).length === 0) {
        const i = nonJson.indexOf('verb=');
        if (i !== -1) {
            const keyValues = nonJson.substring(i).split(' ');
            for (const kv of keyValues) {
                const parts = kv.split('=');
                if (parts.length === 2) {
                    additionalJSON[parts[0]] = parts[1];
                }
            }
        }
    }

    return { date, level, category, message, additionalJSON };
}
