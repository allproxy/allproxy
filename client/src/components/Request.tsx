import React from 'react';
import { observer } from "mobx-react-lite";
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
					<div className="request__msg-time-bar-container"
						title={`${message.elapsedTime} ms, ${formatTimestamp(message.timestamp)}, seqNum=${message.sequenceNumber}`}>
						<div style={{width: `calc(100% - ${timeBarPercent})` }}/>
						<div className={'request__msg-time-bar'}
							style={{ width: timeBarPercent }} />
					</div>
					<div className={`fa ${store.getIconClass()} request__msg-icon`}
						title={store.getTooltip()}
						style={{ cursor: 'pointer', float: 'left', color: store.getColor() }}
						onClick={ onResend }
					>
					</div>
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
						({message.clientIp+'->' + message.serverHost}) {store.getUrl()}
					</div>
				</div>
			</div>
			<div className="request__body" hidden={!isActive}>
				{store.getRequestBody()}
			</div>
		</div>
	)
})

function formatTimestamp(timestamp: number) {
	// return json.sequenceNumber; // used for testing only
	const date = new Date(timestamp);
	const minutes = date.getMinutes().toString().padStart(2,'0');
	const seconds = date.getSeconds().toString().padStart(2,'0');
	const msecs = date.getMilliseconds().toString().padStart(3,'0');
	return `${minutes}:${seconds}.${msecs}`;
}

export default Request;