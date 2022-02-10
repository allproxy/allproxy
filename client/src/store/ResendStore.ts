import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import { socketStore } from "./SocketStore";

export default class ResendStore {
    private message: Message;
    private method: string;
    private url: string;
    private body: string | object;
    private error = '';

    public constructor(message: Message) {
        this.message = JSON.parse(JSON.stringify(message));
        this.method = message.method!;
        this.url = message.url!;
        this.body = message.requestBody;
		makeAutoObservable(this);
    }

    public getMessage() {
        return this.message;
    }

    public getMethod() {
        return this.method;
    }

    @action setMethod(value: string) {
        this.method = value;
    }

    public getUrl() {
        return this.url;
    }

    @action setUrl(value: string) {
        this.url = value;
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
        const method = this.method;
        let url = this.url;

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