import { makeAutoObservable, action } from "mobx"
import Message from '../common/Message';
import { socketStore } from "./SocketStore";

export default class ResendStore {
    private message: Message;
    private method: string;
    private protocol: string = 'http';
    private host: string = '';
    private port: string = '';
    private path: string = '';
    private body: string | object;
    private error = '';

    public constructor(message: Message) {
        this.message = JSON.parse(JSON.stringify(message));
        this.method = message.method!;
        if (message.url!.indexOf('://') !== -1) {
            if (message.url!.startsWith('https://')) {
                this.protocol = "https";
            } else {
                this.protocol = 'http';
            }        
            
            let tokens = message.url!.split("://");
            this.path = tokens[1].substring(tokens[1].indexOf('/'));
            tokens = tokens[1].split('/', 1);            
            tokens = tokens[0].split(':');
            this.host = tokens[0];
            if (tokens.length > 1) {
                this.port = tokens[1];
            } else {
                this.port = this.protocol === 'https' ? '443' : '80';
            }           
        } else {
            this.path = message.url!;
        }
        
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

    public doResend() {
        const method = this.method;
        let url = this.host.length > 0 ? this.protocol + '://' + this.host + ':' + this.port + this.path : this.path;

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