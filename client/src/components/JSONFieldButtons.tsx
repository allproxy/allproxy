import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { formatJSONPrimaryFields } from '../ImportJSONFile';
import { pickButtonStyle } from '../PickButtonStyle';
import pickIcon from '../PickIcon';
import MessageQueueStore from '../store/MessageQueueStore';
import MessageStore from '../store/MessageStore';

/**
 * JSON Fields
 */
type Props = {
	messageQueueStore: MessageQueueStore
};
const JSONFieldButtons2 = observer(({ messageQueueStore }: Props): JSX.Element | null => {

	useEffect(() => {
		messageQueueStore.buildJSONFields(messageQueueStore.getMessages(), []);
	}, [messageQueueStore])

	if (messageQueueStore.getJsonPrimaryFields().length === 0 || messageQueueStore.getMessages().length === 0) return null;

	const iconColor = messageQueueStore.getMessages()[0].getColor();

	return (
		<div className="jsonfieldbuttons">

			<div className={pickIcon('log:')}
				style={{ color: iconColor, margin: '0 .5rem' }}></div>
			{messageQueueStore.getJsonPrimaryFields().map((field, i) => (
				<button className={"btn btn-sm " + (field.selected ? "btn-primary" : "btn-secondary")}
					key={field.name}
					style={field.selected ? { margin: ".5rem .25rem", background: pickButtonStyle(field.name).background, color: pickButtonStyle(field.name).color } : { margin: ".5rem .25rem" }}
					onClick={() => {
						messageQueueStore.getJsonPrimaryFields()[i].selected = !messageQueueStore.getJsonPrimaryFields()[i].selected;
						const selectedFields = messageQueueStore.getJsonPrimaryFields();
						const primaryFields: string[] = [];
						for (const f of selectedFields) {
							if (f.selected) {
								primaryFields.push(f.name);
							}
						}
						updatePrimaryJSONFields(messageQueueStore.getMessages(), primaryFields);
					}}
				>
					{field.name}
				</button>
			))}

		</div>
	)
});

export function updatePrimaryJSONFields(messages: MessageStore[], primaryFields: string[]) {
	for (const messageStore of messages) {
		updatePrimaryJSONField(messageStore, primaryFields);
	}
}

export function updatePrimaryJSONField(messageStore: MessageStore, primaryFields: string[]) {
	const message = messageStore.getMessage();
	if (message.protocol !== 'log:' || typeof message.responseBody === 'string') return;
	let nonJSON = '';
	const i = message.url?.indexOf('<span');
	if (i !== -1) {
		nonJSON = message.url?.substring(0, i) + ' ';
	} else if (primaryFields.length === 0) {
		nonJSON = JSON.stringify(message.responseBody)
	}

	messageStore.setUrl(nonJSON +
		formatJSONPrimaryFields(message.responseBody as { [key: string]: string }, primaryFields)
	);
}

function JSONFieldButtons(messageQueueStore: MessageQueueStore) {
	return <JSONFieldButtons2 messageQueueStore={messageQueueStore}></JSONFieldButtons2>
}

export default JSONFieldButtons;