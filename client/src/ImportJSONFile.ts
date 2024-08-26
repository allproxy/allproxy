import Message, { MessageType } from "./common/Message";
import { untruncateJson } from "./UntruncateJSON";

export function importJsonLines(fileName: string, jsonLines: string[]): Message[] {
    const messages: Message[] = [];
    let sequenceNumber = 1;

    for (let record of jsonLines) {
        sequenceNumber++;
        const message = newMessage(record, sequenceNumber, fileName);
        if (message) {
            messages.push(message);
            ++sequenceNumber;
        }
    }

    return messages;
}

export function newMessage(record: string, sequenceNumber: number, fileName: string): Message | undefined {
    record = record.trim();
    if (record.length === 0) return;

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

    let json: { [key: string]: any } | undefined;
    try {
        json = JSON.parse(record);
    } catch (e) {
        try {
            json = JSON.parse(untruncateJson(record));
            jsonTruncated = true;
        } catch (e) {
        }
    }

    if (json) {
        const m = newJSONMessage(nonJson, json, sequenceNumber, fileName);
        m.jsonTruncated = jsonTruncated;
        // Convert JSON strings to JSON
        const parseJsonFields = function (json: any) {
            for (const key in json) {
                const value = json[key];
                if (typeof value === 'string') {
                    if (value.startsWith('{') && value.endsWith('}') || value.startsWith('[') && value.endsWith(']')) {
                        try {
                            json[key] = JSON.parse(value);
                        } catch (e) { }
                    }
                } else if (Array.isArray(value)) {
                    parseJsonFields(value);
                } else if (typeof value === 'object') {
                    parseJsonFields(value);
                }
            }
        };
        parseJsonFields(json);
        return m;
    } else {
        return newJSONMessage('', record, sequenceNumber, fileName);
    }
}

export function newJSONMessage(title: string, data: string | {}, sequenceNumber: number = 0, fileName: string = ''): Message {
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
            "hostname": '',
            "port": 0,
            "recording": true,
            "hostReachable": true,
            "comment": ""
        },
        jsonTruncated: false,
        note: '',
    };
    return message;
}