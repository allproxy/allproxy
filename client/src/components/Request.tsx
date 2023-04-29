import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import { observer } from "mobx-react-lite";
import React from "react";
import ReactJson from "react-json-view";
import { colorScheme } from "../App";
import { messageQueueStore } from "../store/MessageQueueStore";
import MessageStore from '../store/MessageStore';
import { snapshotStore } from "../store/SnapshotStore";
import NoteDialog from "./NoteDialog";


type Props = {
	isActive: boolean,
	highlight: boolean,
	onClick: () => void,
	onResend: () => void,
	store: MessageStore,
	timeBarPercent: string,
	maxStatusSize: number,
	maxMethodSize: number,
	maxEndpointSize: number,
	vertical: boolean,
};
const Request = observer(({ isActive, highlight, onClick, store, onResend, timeBarPercent, maxStatusSize, maxMethodSize, maxEndpointSize, vertical }: Props) => {
	const [moreMenuIcon, setMoreMenuIcon] = React.useState<HTMLButtonElement | null>(null);
	const [openNoteDialog, setOpenNoteDialog] = React.useState(false);

	const handleClick = (e: any) => {
		const span = e.target.closest("SPAN") as HTMLSpanElement;
		if (span && span.className === 'json-label' && e.currentTarget.contains(span)) {
			const field = span.childNodes[0];
			if (field !== null) {
				const element = field.parentElement;
				if (element !== null) {
					const name = element.attributes.getNamedItem('name');
					if (name != null) {
						const text = name.textContent;
						if (text !== null) {
							// This feature is disabled
							//jsonLogStore.toggleDisabledFieldName(text);
							//return;
						}
					}
				}
			}
		}
		onClick();
		store.setVisited(true);
	}
	const message = store.getMessage();
	const percent = store.isNoResponse() ? '100%' : timeBarPercent;
	const responseTime = store.isNoResponse() ? 'no response' : message.elapsedTime ? message.elapsedTime + ' ms' : '';
	const levelColor = function (level: string): string | undefined {
		if (level === 'err' || level === 'error') return 'red';
		if (level === 'warning' || level === 'warn') return 'rgb(203, 75, 22)';
		return undefined;
	}

	return (
		<><div>
			<div className="request__msg-container">
				<div className="request__msg-header">
					<div className="request__msg-time-ms">
						{message.protocol !== 'log:' ?
							responseTime
							:
							<div className="request__msg-log-level" style={{ fontFamily: 'monospace' }}>
								{dateToHHMMSS(store.getLogEntry().date)}
							</div>}
					</div>
					<div className="request__msg-time-bar-container">
						<div style={{ width: `calc(100% - ${percent})` }} />
						<div className={'request__msg-time-bar' + (store.isNoResponse() ? ' no-response' : '')}
							style={{ width: percent }} />
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
					<button className={`request__msg-resend-btn ${isActive ? 'active' : ''} btn btn-xs btn-success`}
						onClick={(e) => setMoreMenuIcon(e.currentTarget)}
					>
						<div className="fa fa-ellipsis-v" style={{ padding: '0px .5rem' }} title="Click to open menu"></div>
					</button>
					<Menu
						anchorEl={moreMenuIcon}
						open={Boolean(moreMenuIcon)}
						onClose={() => setMoreMenuIcon(null)}
					>
						<MenuItem>
							<div className="fa fa-sticky-note"
								onClick={() => {
									if (store.hasNote()) {
										store.setNote('');
									} else {
										setOpenNoteDialog(true);
										setMoreMenuIcon(null);
									}
								}}
							>
								&nbsp;{store.hasNote() ? 'Delete Note' : 'Add Note'}
							</div>
						</MenuItem>
						<MenuItem hidden={!canResend()}>
							<div className="fa fa-paper-plane"
								onClick={() => {
									onResend();
									setMoreMenuIcon(null);
								}}
							>
								&nbsp;Resend Request
							</div>
						</MenuItem>
						<MenuItem hidden={!canResend()}>
							<div className="fa fa-copy"
								onClick={() => {
									copyToClipboard();
									setMoreMenuIcon(null);
								}}
							>
								&nbsp;Copy as curl
							</div>
						</MenuItem>
						<MenuItem style={{
							opacity: message.protocol === 'log:' ? undefined : 0.3,
							pointerEvents: message.protocol === 'log:' ? undefined : 'none'
						}}>
							<div className="header__export fa fa-copy" title="Copy to clipboard"
								onClick={() => {
									navigator.clipboard.writeText(snapshotStore.copyMessage(message))
									setMoreMenuIcon(null);
								}}
							>
								&nbsp;Copy to Clipboard
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
						`}>
							{message.method && message.method.length > 0 &&
								<div className="request__msg-method" style={{ width: maxMethodSize + 1 + 'ch' }}>
									{message.method}
								</div>}
							{messageQueueStore.getShowAPI() && message.endpoint.length > 0 && <div className="request__msg-endpoint" style={{ width: maxEndpointSize + 'ch' }}>
								{message.endpoint}
							</div>}
							{messageQueueStore.getShowUserAgent() && message.protocol !== 'log:' && <div className="request__msg-client request__msg-highlight">{store.getRequestClient()}</div>}
							<div dangerouslySetInnerHTML={{ __html: store.getRequestUrl() }} />
						</div>
					</div>
				</div>
			</div>
			<div className="request__body" hidden={!vertical || !isActive || store.getMessage().protocol === 'log:'}>
				{!store.isRequestBodyJson()
					? store.getRequestBody()
					: <ReactJson
						theme={colorScheme === 'dark' ? 'google' : undefined}
						src={message.requestBody as object}
						name={false}
						displayDataTypes={false}
						quotesOnKeys={false} />}
			</div>
		</div>
			<NoteDialog
				message={store}
				open={openNoteDialog}
				onClose={() => {
					setOpenNoteDialog(false);
				}} />
		</>
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
	return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0') + ':' + d.getSeconds().toString().padStart(2, '0');
}

export default Request;