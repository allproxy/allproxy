import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';

export default class ResendStore {
    private message: Message;
    private methodAndUrl: string;
    private body: string;
    private error = '';

    public constructor(message: Message) {
        this.message = message;
        this.methodAndUrl = message.method + ' ' + message.url;
        this.body = message.requestBody ? JSON.stringify(message.requestBody) : '';
		makeAutoObservable(this);
    }

    public getMessage() {
        return this.message;
    }

    public getMethodAndUrl() {
        return this.methodAndUrl;
    }

    @action setMethodAndUrl(value: string) {
        this.methodAndUrl = value;
    }

    public getBody() {
        return this.body;
    }

    public getError() {
        return this.error;
    }

    @action public validateBody(body: string) {
        this.body = body;
        if(body) {
            if(body.length > 0) {
                try {
                    if(!(JSON.parse(body) instanceof Object)) {
                        this.error = 'JSON format invalid!';
                    }
                    else {
                        this.error = '';
                    }
                }
                catch(e) {
                    this.error = 'JSON format invalid!';
                }
            }
        }
    }

    public doResend() {
        const tokens = this.methodAndUrl.split(' ', 2);
        let method;
        let url;
        if (tokens.length > 1) {
            method = tokens[0];
            url = tokens[1];
        } else {
            url = this.methodAndUrl;
            method = 'GET';
        }

        const headers: {[key: string]: string} = {};
        const unsafeHeaders = ['host',
                                'connection',
                                'content-length',
                                'origin', 'user-agent',
                                'referer',
                                'accept-encoding',
                                'cookie',
                                'sec-fetch-dest',
                                'proxy-connection',
                            ];
        for(var header in this.message.requestHeaders) {
            if(unsafeHeaders.indexOf(header) === -1) {
                headers[header] = this.message.requestHeaders[header];
            }
        }

        headers['middleman_proxy'] = 'resend';

        if(!url.startsWith('http:') && !url.startsWith('https:')) {
            const protocolHost = document.location.protocol+'//'+document.location.host;
            url = protocolHost+url;
        }

        fetch(url, {
            method,
            headers,
            body: method !== 'GET' ? this.body : undefined,
        })
        .then((response) => response.json())
        .then(/*data => console.log(data)*/);
    }
}