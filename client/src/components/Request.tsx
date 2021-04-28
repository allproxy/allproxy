import React from 'react';
import { observer } from "mobx-react-lite";
import MessageStore from '../store/MessageStore';

type Props = {
	isActive: boolean,
	onClick: () => void,
	onResend: () => void,
	store: MessageStore,
};
const Request = observer(({ isActive, onClick, store, onResend }: Props) => {
	return (
		<div className="request__msg-container">
			<div className="request__msg-timestamp-container" title={ `sequence number: ${store.getMessage().sequenceNumber}`  }>
				<span className="request__msg-timestamp">{formatTimestamp(store.getMessage().timestamp)}</span>
			</div>
			<div className={`fa ${store.getIconClass()} request__msg-icon`}
				title={store.getTooltip()}
				style={{ cursor: 'pointer', float: 'left', color: store.getColor() }}
				onClick={ onResend }
			>
			</div>
			<div className={`fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`}>
			</div>
			<div className={`request__msg
				${isActive ? ' active' : ''}
				${store.isError() ? ' error' : ''}
				${store.getVisited() && !store.isError() ? ' visited-color' : ''}
				`}
				title={store.getRequestBody()}
				onClick={() => { onClick(); store.setVisited(true); } }
			>
				{store.getMessage().method+' '}
				<b>{store.getMessage().endpoint+' '}</b>
				({store.getMessage().clientIp+'->' + store.getMessage().serverHost}) {store.getUrl()}
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