import Message, { MessageType } from "./common/Message";
import { untruncateJson } from "./UntruncateJSON";

export function importJsonLines(fileName: string, jsonLines: string[], primaryJsonFields: string[]): Message[] {
    const messages: Message[] = [];
    let sequenceNumber = 1;
    const hostname = primaryJsonFields.join(',');
    for (let record of jsonLines) {
        sequenceNumber++;
        const message = newMessage(record, sequenceNumber, fileName, hostname);
        if (message) {
            messages.push(message);
            ++sequenceNumber;
        }
    }

    return messages;
}

export function newMessage(record: string, sequenceNumber: number, fileName: string, hostname: string): Message | undefined {
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
        const m = newJSONMessage(nonJson, json, sequenceNumber, fileName, hostname);
        m.jsonTruncated = jsonTruncated;
        return m;
    } else {
        return newJSONMessage('', record, sequenceNumber, fileName, hostname);
    }
}

export function newJSONMessage(title: string, data: string | {}, sequenceNumber: number = 0, fileName: string = '', hostname: string = ''): Message {
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
            "hostname": hostname,
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