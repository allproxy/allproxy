import React from 'react';
import { observer } from "mobx-react-lite";
import { Tooltip } from '@material-ui/core';
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
			<Tooltip title={store.getTooltip()} aria-label={store.getTooltip()}>
				<div className={`fa ${store.getIconClass()} request__msg-icon`}
					style={{ cursor: 'pointer', float: 'left', color: store.getColor() }}
					onClick={ onResend }
				>
				</div>
			</Tooltip>
			<div className={`fa ${isActive ? 'fa-caret-down' : 'fa-caret-right'} request__msg-caret`}>
			</div>
			<div className={`request__msg
				${isActive ? ' active' : ''}
				${store.isError() ? ' error' : ''}
				${store.getVisited() && !store.isError() ? ' visited-color' : ''}
				`}
				onClick={() => { onClick(); store.setVisited(true); } }
			>
				{store.getMessage().method+' '}
				<span style={{ fontWeight: "bold" }}>
					{store.getMessage().endpoint}
				</span>
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