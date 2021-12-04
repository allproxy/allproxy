import { makeAutoObservable, action } from "mobx"
import colorPicker from '../ColorPicker';
import Message, { NO_RESPONSE } from '../common/Message';
import pickIcon from '../PickIcon';
import Util from '../Util';

export default class MessageStore {
    private message: Message = new Message();
    private url = '';
    private _isError = false;
    private visited = false;
    private color = '';
    private iconClass = '';
    private tooltip = '';

    public constructor(message: Message) {
        this.message = message;
        this.url = this.formatUrl(message.url!);
        this._isError = this.isErrorResponse(message);
        this.visited = false;
        this.color = colorPicker(message);
        if (message.requestHeaders['allproxy'] === 'resend') {
            this.iconClass = 'fa fa-clone';
            this.iconClass += ' resend-icon';
        }
        else {
            this.iconClass = pickIcon(message.proxyConfig!.protocol);
        }
        this.tooltip = message.method ? 'Click to resend request' : '';
        makeAutoObservable(this);
    }

    public getMessage(): Message {
        return this.message!;
    }

    public getUrl(): string {
        return this.url;
    }

    public isNoResponse(): boolean {
        return this.message.responseBody === NO_RESPONSE;
    }

    public isError(): boolean {
        return this._isError;
    }

    public getColor(): string {
        return this.color;
    }

    public getIconClass(): string {
        return this.iconClass;
    }

    public getTooltip(): string {
        return this.tooltip;
    }

    public getVisited(): boolean {
        return this.visited;
    }

    public getRequestLine(): string {
        let str;
        if (this.message.proxyConfig && this.message.proxyConfig.protocol === 'browser:') {
            str = `${this.message.clientIp}->${this.message.serverHost}${this.getUrl()}`;
        } else {
            str = `(${this.message.clientIp}->${this.message.serverHost}) ${this.getUrl()}`;
        }
        return str;
    }

    @action public setVisited(value: boolean) {
        this.visited = value;
    }

    public isRequestBodyJson() {
        return this.message.requestBody
            && typeof this.message.requestBody === 'object'
            && (this.message.protocol === 'http:' || this.message.protocol === 'https:');
    }

    public getRequestBody(): string {
        let body = this.message.method && this.message.method.length > 0 ? this.url + '\n' : '';

        if(this.message.requestBody) {
            let jsonBody = (this.message.requestBody as any);
            if(jsonBody['allproxy_inner_body']) {
                body += jsonBody['allproxy_inner_body'];
            }
            else if(
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