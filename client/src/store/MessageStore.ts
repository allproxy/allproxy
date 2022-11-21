import { makeAutoObservable, action } from "mobx"
import colorPicker from '../ColorPicker';
import Message, { NO_RESPONSE } from '../common/Message';
import pickIcon, { getDisplayableUserAgent } from '../PickIcon';
import Util from '../Util';

export default class MessageStore {
    private message: Message = new Message();
    private url = '';
    private _isError = false;
    private visited = false;
    private colorObj: { color: string, iconClass: string };
    private iconClass = '';
    private tooltip = '';
    private note = '';

    public constructor(message: Message) {
        this.message = message;
        this.url = this.formatUrl(message.url!);
        this._isError = this.isErrorResponse(message);
        this.visited = false;
        this.colorObj = colorPicker(message);
        if (message.requestHeaders['allproxy'] === 'resend') {
            this.iconClass = 'fa fa-clone ';
            this.iconClass += ' resend-icon';
        }
        else {
            this.iconClass = pickIcon(message.proxyConfig!.protocol, this.getUserAgent());
            if (message.jsonTruncated) {
                this.iconClass = 'fa fa-file-excel';
            }
        }
        this.iconClass += ' ' + this.colorObj.iconClass;
        this.tooltip = message.method ? 'Click to resend request' : '';
        this.note = message.note;
        makeAutoObservable(this);
    }

    public hasNote() {
        return this.getNote() !== undefined && this.getNote().length > 0;
    }

    public getNote(): string {
        return this.note;
    }
    @action setNote(note: string) {
        this.note = note;
        this.message.note = note;
    }

    public getMessage(): Message {
        return this.message!;
    }

    public getUrl(): string {
        return this.url;
    }

    @action public setUrl(url: string) {
        this.url = url;
    }

    public isNoResponse(): boolean {
        return this.message.responseBody === NO_RESPONSE;
    }

    public isError(): boolean {
        return this._isError;
    }

    public getColor(): string {
        return this.colorObj.color;
    }

    public getIconClass(): string {
        return this.iconClass;
    }

    public getDomain(): string | undefined {
        return this.message.requestHeaders['host'];
    }

    public getTooltip(): string {
        return this.tooltip;
    }

    public getVisited(): boolean {
        return this.visited;
    }

    public getRequestUrl(): string {
        let str = '';
        if (this.isHttpOrHttps()) {
            str = this.getUrl().startsWith('http:') || this.getUrl().startsWith('https:')
                ? this.getUrl()
                : `${this.message.protocol}//${this.message.serverHost}${this.getUrl()}`;
            const tokens = str.split('://', 2);
            const parts = tokens[1].split('/');
            const host = parts[0];
            let uri = parts.length === 1 ? '/' : '/' + parts.slice(1).join('/');
            if (uri.indexOf('?') !== -1) {
                uri = uri.replace('?', '<span class="request__msg-unhighlight">?');
                uri += '</span>';
            }

            str = `${tokens[0]}://<span class="request__msg-highlight">${host}</span>${uri}`;
        } else if (this.message.proxyConfig && this.message.proxyConfig.protocol === 'log:') {
            str = this.getUrl()
        } else {
            str = `${this.message.serverHost} ${this.getUrl()}`;
        }
        return str;
    }

    public getRequestClient(): string | undefined {
        let ip = this.message.clientIp;
        if (ip === undefined || ip === '127.0.0.1' || ip === '::1' || ip?.indexOf('loopback') !== -1) {
            ip = getDisplayableUserAgent(this.getUserAgent());
        }
        return ip;
    }

    @action public setVisited(value: boolean) {
        this.visited = value;
    }

    public isRequestBodyJson() {
        return this.message.requestBody
            && typeof this.message.requestBody === 'object'
            && (this.message.protocol === 'http:' || this.message.protocol === 'https:');
    }

    public getRequestTooltip(): string {
        if (this.message.protocol === "log:") {
            return JSON.stringify(this.message.responseBody, null, 2);
        }
        else {
            return this.getRequestBody();
        }
    }

    public getRequestBody(): string {
        let body = this.message.method && this.message.method.length > 0 ? this.url + '\n' : '';

        if (this.message.requestBody) {
            let jsonBody = (this.message.requestBody as any);
            if (jsonBody['allproxy_inner_body']) {
                body += jsonBody['allproxy_inner_body'];
            }
            else if (
                typeof this.message.requestBody === 'string' &&
                this.message.requestHeaders['content-type'] &&
                this.message.requestHeaders['content-type'].includes('application/x-www-form-urlencoded')) {
                const params = this.message.requestBody.split('&');
                body += JSON.stringify(params, null, 2);
            } else if (typeof this.message.requestBody === 'string') {
                body += this.message.requestBody as string;
            } else {
                body += JSON.stringify(this.message.requestBody, null, 2);
            }
            // body = Util.fixNewlines(body);
        }
        return body;
    }

    private getUserAgent(): string {
        return this.message.requestHeaders ? this.message.requestHeaders["user-agent"] : "";
    }

    public getUserAgentDisplayable(): string | undefined {
        return getDisplayableUserAgent(this.getUserAgent());
    }

    public isHttpOrHttps() {
        return this.message.protocol === 'http:'
            || this.message.protocol === 'https:';
    }

    public isGrpc(): boolean {
        return this.message.proxyConfig?.protocol === 'grpc:';
    }

    public getGrpcStatus(): number {
        const status = this.message.responseHeaders['grpc-status'];
        return status ? Number(status) : 0;
    }

    public getGrpcMessage(): string {
        const grpcMessage = this.message.responseHeaders['grpc-message'];
        return grpcMessage ? grpcMessage : '';
    }

    private formatUrl(urlStr: string): string {
        //var url = urlStr.indexOf('?') !== -1 ? urlStr.split('?')[0] : urlStr;
        let url = unescape(urlStr);
        url = Util.fixNewlines(url);
        return url.split(/\s+/).join(' ');
    }

    private isErrorResponse(message: Message): boolean {
        // Set error class to make text red
        return message.status >= 400
            || (message.proxyConfig?.protocol === 'grpc:'
                && message.responseHeaders['grpc-status']
                && Number(message.responseHeaders['grpc-status']) > 0)
            || ((message.protocol === 'mysql:')
                && message.status !== 0)
            || Util.isGraphQlError(message);
    }
}