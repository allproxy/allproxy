import Message, { MessageType } from "./common/Message";
import { pickButtonStyle } from "./PickButtonStyle";

export function importJSONFile(fileName: string, jsonContent: string, primaryJsonFields: string[]): Message[] {
    const messages: Message[] = [];
    let sequenceNumber = 0;
    for (let record of jsonContent.split('\n')) {
        record = record.trim();
        if (record.length === 0) continue;

        // Look for embedded JSON object
        let nonJson = '';
        if (!record.startsWith('{') && !record.startsWith('[')) {
            const i = record.indexOf('{');
            if (i !== -1) {
                try {
                    const json = JSON.parse(record.substring(i));
                    nonJson = record.substring(0, i) + ' ';
                    record = JSON.stringify(json);
                } catch (e) { }
            }
        }

        const hasPrimaryJsonField = (json: { [key: string]: any }): boolean => {
            const keys = Object.keys(json);
            for (const key of primaryJsonFields) {
                if (keys.indexOf(key) !== -1) {
                    return true;
                }
            }
            return false;
        }

        let json: { [key: string]: any } | undefined
        try {
            json = JSON.parse(record)
        } catch (e) { }

        if (json) {
            if (hasPrimaryJsonField(json)) {
                messages.push(newMessage(nonJson + formatJSONPrimaryFields(json, primaryJsonFields), json));
            } else {
                const title = record.split('\n')[0];
                messages.push(newMessage(nonJson + title, json));
            }
        } else {
            const title = record.split('\n')[0];
            messages.push(newMessage(title, record));
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
            path: '',
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
            }
        };
        return message;
    }
}

export function formatJSONPrimaryFields(json: { [key: string]: string }, primaryJsonFields: string[]): string {
    let title = '';
    primaryJsonFields.forEach((field) => {
        if (json[field]) {
            if (title.length > 0) title += ', ';
            const style = pickButtonStyle(field);
            title += `<span style="color:${style.background};padding: 0 .25rem;border-radius: .25rem;border:${style.background} thin solid">`
                + field +
                '</span> ' + json[field];
        }
    })
    return title;
}
