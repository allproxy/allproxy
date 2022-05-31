import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import { socketStore } from "./SocketStore";

const LOCAL_STORAGE_HEADERS = 'anyproxy-resend-headers'

export default class ResendStore {
    private message: Message;
    private method: string;
    private protocol: string = 'http';
    private host: string = '';
    private port: string = '';
    private path: string = '';
    private body: string | object;
    private error = '';
    private replaceHeaders: { [key: string]: string }[] = [];

    public constructor(message: Message) {
        this.message = JSON.parse(JSON.stringify(message));
        this.method = message.method!;
        if (message.protocol === 'https:') {
            this.protocol = "https";
        } else {
            this.protocol = 'http';
        }

        this.body = message.requestBody;
        const strHeaders = localStorage.getItem(LOCAL_STORAGE_HEADERS);
        if (strHeaders) {
            this.replaceHeaders = JSON.parse(strHeaders);
        }

        this.updateHostPort();

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

    public getProtocol() {
        return this.protocol;
    }

    @action setProtocol(value: string) {
        this.protocol = value;
    }

    public getHost() {
        return this.host;
    }

    @action setHost(value: string) {
        this.host = value;
    }

    public getPort() {
        return this.port;
    }

    @action setPort(value: string) {
        this.port = value;
    }

    public getPath() {
        return this.path;
    }

    @action setPath(value: string) {
        this.path = value;
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

    public newReplaceHeader() {
        this.replaceHeaders.push({ key: '', value: '' });
    }

    public deleteReplaceHeader(i: number) {
        this.replaceHeaders.splice(i, 1);
        localStorage.setItem(LOCAL_STORAGE_HEADERS, JSON.stringify(this.replaceHeaders));
        this.updateHostPort();
    }

    public getReplaceHeaders(): { [key: string]: string }[] {
        return this.replaceHeaders;
    }

    public getHeaderKeys(): string[] {
        return Object.keys(this.message.requestHeaders);
    }

    @action public setHeaderKey(i: number, key: string) {
        const value = this.message.requestHeaders[key];
        this.replaceHeaders.splice(i, 1, { key, value });
        localStorage.setItem(LOCAL_STORAGE_HEADERS, JSON.stringify(this.replaceHeaders));
        this.updateHostPort();
    }

    @action public setHeaderValue(i: number, value: string) {
        const key = this.replaceHeaders[i].key;
        this.replaceHeaders.splice(i, 1, { key, value });
        localStorage.setItem(LOCAL_STORAGE_HEADERS, JSON.stringify(this.replaceHeaders));
        this.updateHostPort();
    }

    private updateHostPort() {
        let tokens = this.message.url!.split("://");
        this.path = tokens[1].substring(tokens[1].indexOf('/'));
        tokens = tokens[1].split('/', 1);
        tokens = tokens[0].split(':');
        this.host = tokens[0];
        if (tokens.length > 1) {
            this.port = tokens[1];
        } else {
            this.port = this.protocol === 'https' ? '443' : '80';
        }

        const keyValue = this.replaceHeaders.find(keyValue => keyValue.key === 'host');
        if (keyValue) {
            const tokens = keyValue.value.split(':');
            this.host = tokens[0];
            this.port = tokens.length == 1 ? this.port = this.protocol === 'https' ? '443' : '80' : tokens[1];
        }
    }

    public doResend() {
        const method = this.method;
        let url = this.host.length > 0 ? this.protocol + '://' + this.host + ':' + this.port + this.path : this.path;

        if (this.replaceHeaders.length > 0) {
            for (const keyValue of this.replaceHeaders) {
                this.message.requestHeaders[keyValue.key] = keyValue.value;
            }
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