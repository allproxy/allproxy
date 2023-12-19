import IconButton from "@material-ui/core/IconButton";
import { observer } from "mobx-react-lite";
import React from "react";
import ReactJson from "react-json-view";
import { messageQueueStore } from "../store/MessageQueueStore";
import MessageStore from '../store/MessageStore';
import { mainTabStore } from "../store/MainTabStore";
import JsonLogAnnotator from "./JsonLogAnnotator";
import NoteDialog from "./NoteDialog";
import { themeStore } from "../store/ThemeStore";
import RequestURL from "./RequestURL";
import DeleteDialog from "./DeleteDialog";


type Props = {
	isActive: boolean,
	highlight: boolean,
	onClick: () => void,
	onResend: () => void,
	onDelete: () => void,
	store: MessageStore,
	maxStatusSize: number,
	maxMethodSize: number,
	maxEndpointSize: number,
	vertical: boolean,
	isFiltered: boolean,
	className: string,
	doHighlight: () => void,
};
const Request = observer(({ isActive, highlight, onClick, onDelete, store, onResend, maxStatusSize, maxMethodSize, maxEndpointSize, vertical, isFiltered, className, doHighlight }: Props) => {
	const [openNoteDialog, setOpenNoteDialog] = React.useState(false);
	const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);

	const handleClick = () => {
		onClick();
		store.setVisited(true);
	};
	const message = store.getMessage();
	const messageDate = new Date(message.timestamp);
	const levelColor = function (level: string): { bg: string, color: string } {
		level = level.toLowerCase();
		if (level === 'err' || level === 'error' || level === 'panic') return { bg: '#a2191f', color: 'white' };
		if (level === 'warning' || level === 'warn') return { bg: 'rgb(232, 163, 23)', color: 'black' };
		return { bg: 'lightgrey', color: 'black' };
	};

	return (
		<><div>
			<div className={"request__msg-container"} >
				<div className="request__msg-header">
					<div className={`request__msg-twisty fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`}
						style={{ minWidth: '1rem', marginTop: message.protocol === 'log:' ? '.5rem' : undefined }}
						onClick={handleClick} />
					<div style={{ display: 'flex' }} onClick={doHighlight}>
						<div className={"request__msg-time-number " + className + (highlight ? ' highlight' : '')}>
							<div className={"request__msg-time-ms"}>
								{message.protocol !== 'log:' ?
									<div style={{ fontFamily: 'monospace', minWidth: '8.5rem' }}
										title={message.elapsedTime + ' ms, ' + formatTimestamp(message.timestamp)}>
										{store.isNoResponse() ? 'no response' : dateToHHMMSS(messageDate)}
									</div>
									:
									<div style={{ lineHeight: '1.2' }}>
										<div style={{ fontFamily: 'monospace', marginTop: '.6rem', minWidth: '8.5rem' }}
											title={store.getLogEntry().date.toLocaleDateString()}>
											{dateToHHMMSS(store.getLogEntry().date)}
										</div>
										{store.getLogEntry().level !== '' &&
											<div style={{
												display: 'inline-block', minWidth: '6ch',
												marginBottom: '.25rem', borderRadius: '.25rem', lineHeight: '1', background: levelColor(store.getLogEntry().level).bg, color: levelColor(store.getLogEntry().level).color
											}}>
												{store.getLogEntry().level}
											</div>
										}
									</div>
								}
							</div>
							<div style={{ minWidth: '3.5rem' }}>
								<div

									style={{
										fontFamily: 'monospace',
										margin: message.protocol === 'log:' ? '.5rem 0' : undefined,
										textAlign: 'right'
									}}
								>
									{store.getIndex() + 1}
								</div>
							</div>
						</div>
						{message.protocol !== 'log:' &&
							<div className={`${store.getIconClass()} request__msg-icon`}
								style={{ cursor: 'pointer', float: 'left', color: store.getColor(), fontSize: '16px', marginRight: '.25rem' }}
								title={`${message.elapsedTime} ms, ${formatTimestamp(message.timestamp)}, reqSeq=${message.sequenceNumber} resSeq=${message.sequenceNumberRes}`}
							>
							</div>
						}

						<div className={`request__msg
						${message.protocol !== 'log:' ? ' nowrap' : ''}
						${isActive ? ' active' : ''}
						${!store.isHttpOrHttps() && !store.isNoResponse() && store.isError() ? ' error' : ''}
						`}
							title={messageQueueStore.getShowTooltip() ? store.getRequestTooltip() : undefined}
						>
							<div hidden={!isActive} style={{ display: 'flex', height: '26px', marginTop: message.protocol === 'log:' ? '.5rem' : undefined }}>
								<IconButton size="small">
									<div className="header__export fa fa-trash-alt" title="Delete this entry"
										style={{ marginRight: '0rem', color: 'rgb(245, 0, 87)' }}
										onClick={() => setOpenDeleteDialog(true)}
									>
									</div>
								</IconButton>
								<IconButton size="small" hidden={!canResend()}>
									<div title="Copy cURL to clipboard"
										className="btn-xs btn-primary"
										style={{ marginRight: '0rem' }}
										onClick={() => {
											navigator.clipboard.writeText(mainTabStore.copyAsCurl(message));
										}}>
										cURL
									</div>
								</IconButton>
								<IconButton size="small">
									<div className="header__export fa fa-copy" title="Copy to clipboard"
										style={{ marginRight: '0rem' }}
										onClick={() => {
											navigator.clipboard.writeText(mainTabStore.copyMessage(message));
										}}
									>
									</div>
								</IconButton>
								<IconButton size="small" hidden>
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
							{store.isHttpOrHttps() &&
								<div className={(store.isError() ? 'error' : '') + ' request__msg-status'} style={{ width: maxStatusSize + 'ch' }}>
									{message.status}
								</div>}
							<div className={`
							${(store.getVisited() ? ' visited-color' : '') + ' request__msg-request-line'}
						`}
								style={{ textDecoration: isFiltered ? "line-through" : undefined }}>
								{message.method && message.method.length > 0 &&
									<div className="request__msg-method" style={{ width: maxMethodSize + 1 + 'ch' }}>
										{message.method}
									</div>}
								{messageQueueStore.getShowAPI() && message.endpoint.length > 0 && <div className="request__msg-endpoint" style={{ width: maxEndpointSize + 'ch' }}>
									{message.endpoint}
								</div>}
								{messageQueueStore.getShowUserAgent() && message.protocol !== 'log:' && <div className="request__msg-client request__msg-highlight">{store.getRequestClient()}</div>}
								{message.protocol === 'log:' ?
									<JsonLogAnnotator message={store} />
									:
									<RequestURL message={store} />
								}
							</div>
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
			<DeleteDialog
				open={openDeleteDialog}
				onClose={(doDelete: boolean) => {
					setOpenDeleteDialog(false);
					if (doDelete) {
						onDelete();
					}
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
		return "Invalid Date";
	}
	const monthDay = d.getMonth() + 1 + '/' + d.getDate();
	return monthDay + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
}

export default Request;