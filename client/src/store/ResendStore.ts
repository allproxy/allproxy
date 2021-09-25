import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';

export default class ResendStore {
    private message: Message;
    private methodAndUrl: string;
    private body: string | object;
    private error = '';

    public constructor(message: Message) {
        this.message = message;
        this.methodAndUrl = message.method + ' ' + message.url;
        this.body = message.requestBody;
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

    public getError() {
        return this.error;
    }

    public isBodyJson(): boolean {
        if (
            this.message.requestHeaders['content-type'] &&
            this.message.requestHeaders['content-type'].includes('application/json')
        ) {
            return true;
        }
        return false;
    }

    public getBody() {
        return this.body;
    }

    @action public setBody(body: string | object) {
        this.body = body;
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

        headers['anyproxy'] = 'resend';

        if(!url.startsWith('http:') && !url.startsWith('https:')) {
            const protocolHost = document.location.protocol+'//'+document.location.host;
            url = protocolHost+url;
        }

        let body: undefined | string;
        if (this.isBodyJson()) {
            body = JSON.stringify(this.body);
        } else if (typeof this.body === 'string' && this.body.length > 0) {
            body = this.body;
        }

        fetch(url, {
            method,
            headers,
            body,
        })
        .then((response) => response.json())
        .then(/*data => console.log(data)*/);
    }
}