import { observer } from "mobx-react-lite";
import ReactJson from "react-json-view";
import MessageStore from '../store/MessageStore';

type Props = {
	isActive: boolean,
	onClick: () => void,
	onResend: () => void,
	store: MessageStore,
	timeBarPercent: string,
};
const Request = observer(({ isActive, onClick, store, onResend, timeBarPercent }: Props) => {
	const handleClick = () => { onClick(); store.setVisited(true); }
	const message = store.getMessage();

	return (
		<div>
			<div className="request__msg-container">
				<div className="request__msg-header">
					<div className="request__msg-time-ms">
						{message.elapsedTime} ms
					</div>
					<div className="request__msg-time-bar-container"
						title={`${message.elapsedTime} ms, ${formatTimestamp(message.timestamp)}, seqNum=${message.sequenceNumber}`}>
						<div style={{width: `calc(100% - ${timeBarPercent})` }}/>
						<div className={'request__msg-time-bar'}
							style={{ width: timeBarPercent }} />
					</div>
					<div className={`${store.getIconClass()} request__msg-icon`}
						style={{ cursor: 'pointer', float: 'left', color: store.getColor() }}
					>
					</div>
					<button className={`request__msg-resend-btn ${isActive && canResend() ? 'active' : ''} btn btn-xs btn-success`}
						onClick={ onResend }
					>
						Resend
					</button>
					<div className={`request__msg
						${isActive ? ' active' : ''}
						${store.isError() ? ' error' : ''}
						${store.isNoResponse() ? ' no-response' : ''}
						${store.getVisited() && !store.isError() && !store.isNoResponse()
							? ' visited-color' : ''}
						`}
						title={store.getRequestBody()}
						onClick={ handleClick }
					>
						<div className={`fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`} />
						{store.isHttpOrHttps() && !store.isNoResponse() &&
							message.status + ' '}
						{message.method+' '}
						<b>{message.endpoint+' '}</b>
						{store.getRequestLine()}
					</div>
				</div>
			</div>
			<div className="request__body" hidden={!isActive}>
				{!store.isRequestBodyJson()
					? store.getRequestBody()
					: <ReactJson
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
			&& (message.method === 'GET' || message.method === 'POST' || message.method === 'HEAD');
	}
})

function formatTimestamp(timestamp: number) {
	// return json.sequenceNumber; // used for testing only
	const date = new Date(timestamp);
	const hours = date.getHours().toString().padStart(2,'0');
	const minutes = date.getMinutes().toString().padStart(2,'0');
	const seconds = date.getSeconds().toString().padStart(2,'0');
	const msecs = (date.getMilliseconds()/1000).toFixed(3).toString().replace('0.', '');
	return `${hours}:${minutes}:${seconds}.${msecs}`;
}

export default Request;