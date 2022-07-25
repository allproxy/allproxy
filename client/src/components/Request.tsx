import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { observer } from "mobx-react-lite";
import React from "react";
import ReactJson from "react-json-view";
import { colorScheme } from "../App";
import MessageStore from '../store/MessageStore';


type Props = {
	isActive: boolean,
	onClick: () => void,
	onResend: () => void,
	store: MessageStore,
	timeBarPercent: string,
	maxStatusSize: number,
	maxMethodSize: number,
	maxEndpointSize: number,
};
const Request = observer(({ isActive, onClick, store, onResend, timeBarPercent, maxStatusSize, maxMethodSize, maxEndpointSize }: Props) => {
	const [moreMenuIcon, setMoreMenuIcon] = React.useState<HTMLButtonElement | null>(null);

	const handleClick = () => { onClick(); store.setVisited(true); }
	const message = store.getMessage();
	const percent = store.isNoResponse() ? '100%' : timeBarPercent;
	const responseTime = store.isNoResponse() ? 'no response' : message.elapsedTime + ' ms';

	return (
		<div>
			<div className="request__msg-container">
				<div className="request__msg-header">
					<div className="request__msg-time-ms">
						{responseTime}
					</div>
					<div className="request__msg-time-bar-container">
						<div style={{ width: `calc(100% - ${percent})` }} />
						<div className={'request__msg-time-bar' + (store.isNoResponse() ? ' no-response' : '')}
							style={{ width: percent }} />
					</div>
					<div className={`${store.getIconClass()} request__msg-icon`}
						style={{ cursor: 'pointer', float: 'left', color: store.getColor(), fontSize: '16px' }}
						onClick={handleClick}
						title={`${message.elapsedTime} ms, ${formatTimestamp(message.timestamp)}, reqSeq=${message.sequenceNumber} resSeq=${message.sequenceNumberRes}`}
					>
					</div>
					<button className={`request__msg-resend-btn ${isActive && canResend() ? 'active' : ''} btn btn-xs btn-success`}
						onClick={(e) => setMoreMenuIcon(e.currentTarget)}
					>
						<div className="fa fa-bars"></div>
					</button>
					<Menu
						anchorEl={moreMenuIcon}
						open={Boolean(moreMenuIcon)}
						onClose={() => setMoreMenuIcon(null)}
					>
						<MenuItem>
							<div className="fa fa-paper-plane"
								onClick={() => {
									onResend();
									setMoreMenuIcon(null);
								}}
							>
								&nbsp;Resend Request
							</div>
						</MenuItem>
						<MenuItem>
							<div className="fa fa-copy"
								onClick={() => {
									copyToClipboard();
									setMoreMenuIcon(null);
								}}
							>
								&nbsp;Copy as curl
							</div>
						</MenuItem>
						<MenuItem>
							<div
								onClick={() => {
									setMoreMenuIcon(null);
								}}
							>
								X &nbsp;Close Menu
							</div>
						</MenuItem>
					</Menu>

					<div className={`request__msg
						${isActive ? ' active' : ''}
						${!store.isHttpOrHttps() && !store.isNoResponse() && store.isError() ? ' error' : ''}
						`}
						title={store.getRequestTooltip()}
						onClick={handleClick}
					>
						<div className={`fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`} />
						{store.isHttpOrHttps() &&
							<div className={(store.isError() ? 'error' : '') + ' request__msg-status'} style={{ width: maxStatusSize + 'ch' }}>
								{message.status}
							</div>
						}
						<div className={`
							${(store.getVisited() ? ' visited-color' : '') + ' request__msg-request-line'}
						`}>
							{message.method && message.method.length > 0 &&
								<div className="request__msg-method" style={{ width: maxMethodSize + 1 + 'ch' }}>
									{message.method}
								</div>}
							{message.endpoint.length > 0 && <div className="request__msg-endpoint" style={{ width: maxEndpointSize + 'ch' }}>
								{message.endpoint}
							</div>}
							{message.protocol !== 'log:' && <div className="request__msg-client request__msg-highlight">{store.getRequestClient()}</div>}
							<div dangerouslySetInnerHTML={{ __html: store.getRequestUrl() }} />
						</div>
					</div>
				</div>
			</div>
			<div className="request__body" hidden={!isActive}>
				{!store.isRequestBodyJson()
					? store.getRequestBody()
					: <ReactJson
						theme={colorScheme === 'dark' ? 'google' : undefined}
						src={message.requestBody as object}
						name={false}
						displayDataTypes={false}
						quotesOnKeys={false}
					/>
				}
			</div>
		</div>
	)

	function canResend() {
		return ((message.protocol === 'http:' || message.protocol === 'https:') && message.proxyConfig?.protocol !== 'grpc:')
			&& (message.method === 'GET' ||
				message.method === 'POST' ||
				message.method === 'HEAD' ||
				message.method === 'DELETE' ||
				message.method === 'PUT' ||
				message.method === 'PATCH');
	}

	function copyToClipboard() {
		const method = store.getMessage().method;
		const url = `"${store.getMessage().url?.split('"').join('\\"')}"`;
		let requestBody = store.getMessage().requestBody;
		if (typeof requestBody !== 'string') {
			requestBody = JSON.stringify(requestBody, null, 2);
			requestBody = requestBody.split('\n').join(' \\\n');
			requestBody = requestBody.split('"').join('\\"');
		}
		const body = requestBody.length > 0 ? '-d "' + requestBody + '"\\\n' : '';
		let headers = '';
		for (const key in store.getMessage().requestHeaders) {
			const value = store.getMessage().requestHeaders[key].split('"').join('\\"');
			headers += `-H "${key}: ${value}" \\\n`;
		}
		headers = headers.substring(0, headers.length - ' \\\n'.length);
		const curl = `curl -X ${method} ${url} ${body} ${headers}`
		navigator.clipboard.writeText(curl);
	}
})

function formatTimestamp(timestamp: number) {
	// return json.sequenceNumber; // used for testing only
	const date = new Date(timestamp);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	const msecs = (date.getMilliseconds() / 1000).toFixed(3).toString().replace('0.', '');
	return `${hours}:${minutes}:${seconds}.${msecs}`;
}

export default Request;