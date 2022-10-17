import Message, { MessageType } from "./common/Message";
import { makeRequestTitle } from "./components/JSONFieldButtons";
import { pickButtonStyle } from "./PickButtonStyle";
import { untruncateJson } from "./UntruncateJSON";

export function importJSONFile(fileName: string, jsonContent: string, primaryJsonFields: string[]): Message[] {
    const messages: Message[] = [];
    let sequenceNumber = 0;
    for (let record of jsonContent.split('\n')) {
        record = record.trim();
        if (record.length === 0) continue;

        // Look for embedded JSON object
        let jsonTruncated = false;
        let nonJson = '';
        if (!record.startsWith('{') && !record.startsWith('[')) {
            const q = record.indexOf('"');
            const p = record.indexOf('{');
            const a = record.indexOf('[');
            let i = -1;
            if (p === -1) i = a;
            else if (a === -1) i = p;
            else i = Math.min(p, a);
            if (i !== -1 && i < q) {
                try {
                    const json = JSON.parse(record.substring(i));
                    nonJson = record.substring(0, i) + ' ';
                    record = JSON.stringify(json);
                } catch (e) {
                    let fixed = '';
                    try {
                        fixed = untruncateJson(record.substring(i));
                        jsonTruncated = true;
                        const json = JSON.parse(fixed);
                        nonJson = record.substring(0, i) + ' ';
                        record = JSON.stringify(json);
                    } catch (e) {
                    }
                }
            }
        }

        let json: { [key: string]: any } | undefined
        try {
            json = JSON.parse(record)
        } catch (e) {
            try {
                json = JSON.parse(untruncateJson(record));
                jsonTruncated = true;
            } catch (e) {
            }
        }

        if (json) {
            const m = newMessage(nonJson, json);
            m.jsonTruncated = jsonTruncated;
            messages.push(m);

        } else {
            messages.push(newMessage('', record));
        }
    }

    return messages;

    function newMessage(title: string, data: string | {}): Message {
        sequenceNumber++;
        const message: Message = {
            type: MessageType.REQUEST_AND_RESPONSE,
            modified: false,
            timestamp: 0, // ts
            sequenceNumber,
            sequenceNumberRes: sequenceNumber,
            requestHeaders: {},
            method: '',
            protocol: 'log:',
            url: title,
            endpoint: '',
            requestBody: { allproxy_inner_body: fileName },
            clientIp: '',
            serverHost: fileName,
            path: title,
            elapsedTime: 0,
            responseHeaders: {},
            responseBody: data,
            status: 0,
            proxyConfig: {
                "isSecure": false,
                "path": fileName,
                "protocol": "log:",
                "hostname": primaryJsonFields.join(','),
                "port": 0,
                "recording": true,
                "hostReachable": true,
                "comment": ""
            },
            jsonTruncated: false
        };
        message.url = makeRequestTitle(message, []);
        return message;
    }
}

export function formatJSONPrimaryFields(json: { [key: string]: string }, primaryJsonFields: string[]): string {
    let title = '';
    primaryJsonFields.forEach((field) => {
        if (json[field]) {
            if (title.length > 0) title += ' ';
            const style = pickButtonStyle(field);
            title += `<span style="color:${style.background};padding: 0 .25rem;border-radius: .25rem;border:${style.background} thin solid">`
                + field +
                '</span> ' + json[field];
        }
    })
    return title.length ? title : '';
}
