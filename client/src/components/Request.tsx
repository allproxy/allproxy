import IconButton from "@material-ui/core/IconButton";
import { observer } from "mobx-react-lite";
import React from "react";
import ReactJson from "react-json-view";
import { messageQueueStore } from "../store/MessageQueueStore";
import MessageStore from '../store/MessageStore';
import { snapshotStore } from "../store/SnapshotStore";
import JsonLogAnnotator from "./JsonLogAnnotator";
import NoteDialog from "./NoteDialog";
import { themeStore } from "../store/ThemeStore";


type Props = {
	isActive: boolean,
	highlight: boolean,
	onClick: () => void,
	onResend: () => void,
	store: MessageStore,
	maxStatusSize: number,
	maxMethodSize: number,
	maxEndpointSize: number,
	vertical: boolean,
	isFiltered: boolean,
	className: string,
	maxLogCategorySize: number,
};
const Request = observer(({ isActive, highlight, onClick, store, onResend, maxStatusSize, maxMethodSize, maxEndpointSize, vertical, isFiltered, className, maxLogCategorySize }: Props) => {
	const [openNoteDialog, setOpenNoteDialog] = React.useState(false);

	const handleClick = () => {
		onClick();
		store.setVisited(true);
	};
	const message = store.getMessage();
	const messageDate = new Date(message.timestamp);
	const levelColor = function (level: string): string | undefined {
		if (level === 'err' || level === 'error') return 'red';
		if (level === 'warning' || level === 'warn') return 'rgb(203, 75, 22)';
		return undefined;
	};

	return (
		<><div>
			<div className={"request__msg-container " + className} >
				<div className="request__msg-header">
					<div className="request__msg-time-ms">
						{message.protocol !== 'log:' ?
							<div className="request__msg-log-level" style={{ fontFamily: 'monospace' }}
								title={message.elapsedTime + ' ms, ' + formatTimestamp(message.timestamp)}>
								{store.isNoResponse() ? 'no response' : dateToHHMMSS(messageDate)}
							</div>
							:
							<div className="request__msg-log-level" style={{ fontFamily: 'monospace' }}
								title={store.getLogEntry().date.toLocaleDateString()}>
								{dateToHHMMSS(store.getLogEntry().date)}
							</div>
						}
					</div>
					<div className="request__msg-time-bar-container">
					</div>
					<div className="request__msg-icon fa fa-sticky-note"
						title={store.getNote()}
						style={{ visibility: (!store.hasNote() ? 'hidden' : 'visible'), fontSize: '.75rem', color: '#E8A317' }}>
					</div>
					{message.protocol === 'log:' ?
						<div style={{ minWidth: '6ch', color: levelColor(store.getLogEntry().level) }}>
							{store.getLogEntry().level}
						</div>
						:
						<div className={`${store.getIconClass()} request__msg-icon`}
							style={{ cursor: 'pointer', float: 'left', color: store.getColor(), fontSize: '16px' }}
							onClick={handleClick}
							title={`${message.elapsedTime} ms, ${formatTimestamp(message.timestamp)}, reqSeq=${message.sequenceNumber} resSeq=${message.sequenceNumberRes}`}
						>
						</div>
					}
					<div hidden={!isActive} style={{ display: 'flex' }}>
						<IconButton size="small">
							<div className="header__export fa fa-copy" title="Copy to clipboard"
								style={{ marginRight: '0rem' }}
								onClick={() => {
									navigator.clipboard.writeText(snapshotStore.copyMessage(message));
								}}
							>
							</div>
						</IconButton>
						<IconButton size="small">
							<div className="fa fa-sticky-note"
								title="Add note"
								style={{ marginRight: '0rem', color: '#E8A317' }}
								onClick={() => {
									setOpenNoteDialog(true);
								}}
							>
							</div>
						</IconButton>
						<IconButton size="small" hidden={!canResend()}>
							<div className="fa fa-paper-plane"
								title="Resend HTTP request"
								style={{ marginRight: '.25rem' }}
								onClick={() => {
									onResend();
								}}
							>
							</div>
						</IconButton>
					</div>

					<div className={`request__msg
						${message.protocol !== 'log:' ? ' nowrap' : ''}
						${isActive ? ' active' : ''}
						${highlight ? ' highlight' : ''}
						${!store.isHttpOrHttps() && !store.isNoResponse() && store.isError() ? ' error' : ''}
						`}
						title={messageQueueStore.getShowTooltip() ? store.getRequestTooltip() : undefined}
						onClick={handleClick}
					>
						<div className={`fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`} />
						{store.isHttpOrHttps() &&
							<div className={(store.isError() ? 'error' : '') + ' request__msg-status'} style={{ width: maxStatusSize + 'ch' }}>
								{message.status}
							</div>}
						<div className={`
							${(store.getVisited() ? ' visited-color' : '') + ' request__msg-request-line'}
						`} style={{ textDecoration: isFiltered ? "line-through" : undefined }}>
							{message.method && message.method.length > 0 &&
								<div className="request__msg-method" style={{ width: maxMethodSize + 1 + 'ch' }}>
									{message.method}
								</div>}
							{messageQueueStore.getShowAPI() && message.endpoint.length > 0 && <div className="request__msg-endpoint" style={{ width: maxEndpointSize + 'ch' }}>
								{message.endpoint}
							</div>}
							{messageQueueStore.getShowUserAgent() && message.protocol !== 'log:' && <div className="request__msg-client request__msg-highlight">{store.getRequestClient()}</div>}
							{message.protocol === 'log:' ?
								<JsonLogAnnotator message={store} maxLogCategorySize={maxLogCategorySize} />
								:
								<div dangerouslySetInnerHTML={{ __html: store.getRequestUrl() }} />
							}
						</div>
					</div>
				</div>
			</div>
			<div className="request__body" hidden={!vertical || !isActive || store.getMessage().protocol === 'log:'}>
				{!store.isRequestBodyJson()
					? store.getRequestBody()
					: <ReactJson
						theme={themeStore.getTheme() === 'dark' ? 'google' : undefined}
						src={message.requestBody as object}
						name={false}
						displayDataTypes={false}
						quotesOnKeys={false} />}
			</div>
		</div >
			<NoteDialog
				message={store}
				open={openNoteDialog}
				onClose={() => {
					setOpenNoteDialog(false);
				}} />
		</>
	);

	function canResend() {
		return ((message.protocol === 'http:' || message.protocol === 'https:') && message.proxyConfig?.protocol !== 'grpc:')
			&& (message.method === 'GET' ||
				message.method === 'POST' ||
				message.method === 'HEAD' ||
				message.method === 'DELETE' ||
				message.method === 'PUT' ||
				message.method === 'PATCH');
	}

	// function copyToClipboard() {
	// 	const method = store.getMessage().method;
	// 	const url = `"${store.getMessage().url?.split('"').join('\\"')}"`;
	// 	let requestBody = store.getMessage().requestBody;
	// 	if (typeof requestBody !== 'string') {
	// 		requestBody = JSON.stringify(requestBody, null, 2);
	// 		requestBody = requestBody.split('\n').join(' \\\n');
	// 		requestBody = requestBody.split('"').join('\\"');
	// 	}
	// 	const body = requestBody.length > 0 ? '-d "' + requestBody + '"\\\n' : '';
	// 	let headers = '';
	// 	for (const key in store.getMessage().requestHeaders) {
	// 		const value = store.getMessage().requestHeaders[key].split('"').join('\\"');
	// 		headers += `-H "${key}: ${value}" \\\n`;
	// 	}
	// 	headers = headers.substring(0, headers.length - ' \\\n'.length);
	// 	const curl = `curl -X ${method} ${url} ${body} ${headers}`
	// 	navigator.clipboard.writeText(curl);
	// }
});

export function formatTimestamp(timestamp: number) {
	// return json.sequenceNumber; // used for testing only
	const date = new Date(timestamp);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	const msecs = (date.getMilliseconds() / 1000).toFixed(3).toString().replace('0.', '');
	return `${date.toDateString()} ${hours}:${minutes}:${seconds}.${msecs}`;
}

export function dateToHHMMSS(d: Date) {
	if (isNaN(d.getMonth()) || isNaN(d.getDate())) {
		return "No date";
	}
	const monthDay = d.getMonth() + 1 + '/' + d.getDate();
	return monthDay + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
}

export default Request;