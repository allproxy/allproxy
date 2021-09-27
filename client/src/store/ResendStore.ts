import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import { socketStore } from "./SocketStore";

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

        const forwardProxy = url.startsWith('http:') || url.startsWith('https:');
        if (!forwardProxy) {
            const protocolHost = document.location.protocol + '//' + document.location.host
            url = protocolHost + url
        }

        const body = typeof this.body === 'string' && this.body.length === 0
            ? undefined
            : this.body;

        socketStore.emitResend(
            forwardProxy,
            method,
            url,
            this.message,
            body
        );
    }
}