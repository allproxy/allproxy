import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { formatJSONPrimaryFields } from '../ImportJSONFile';
import { pickButtonStyle } from '../PickButtonStyle';
import MessageQueueStore from '../store/MessageQueueStore';
import MessageStore from '../store/MessageStore';

/**
 * JSON Fields
 */
type Props = {
	messageQueueStore: MessageQueueStore
};
const JSONFields2 = observer(({ messageQueueStore }: Props): JSX.Element | null => {

	useEffect(() => {
		const fieldsMap: { [key: string]: { count: number, selected: boolean } } = {};
		for (const message of messageQueueStore.getMessages()) {
			const json = message.getMessage().responseBody as { [key: string]: any };
			for (const field of Object.keys(json)) {
				if (isNaN(parseInt(field))) {
					if (typeof json[field] === 'string') {
						const selected = message.getMessage().url?.indexOf('>' + field + '<') !== -1;
						fieldsMap[field] = fieldsMap[field] ?
							{ count: fieldsMap[field].count + 1, selected } :
							{ count: 1, selected };
					}
				}
			}
		}

		const fields2: { name: string, selected: boolean }[] = [];
		for (const key of Object.keys(fieldsMap)) {
			if (fieldsMap[key].count > 1) {
				fields2.push({ name: key, selected: fieldsMap[key].selected });
			}
		}
		messageQueueStore.setJsonPrimaryFields(fields2);

	}, [messageQueueStore])

	return (
		<div>
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
		</div >
	)
});

export function updatePrimaryJSONFields(messages: MessageStore[], primaryFields: string[]) {
	for (const message of messages) {
		if (message.getMessage().protocol !== 'log:' || typeof message.getMessage().responseBody === 'string') continue;
		let nonJSON = '';
		const i = message.getMessage().url?.indexOf('<span');
		if (i !== -1) {
			nonJSON = message.getMessage().url?.substring(0, i) + ' ';
		} else if (primaryFields.length === 0) {
			nonJSON = JSON.stringify(message.getMessage().responseBody)
		}

		message.setUrl(nonJSON +
			formatJSONPrimaryFields(message.getMessage().responseBody as { [key: string]: string }, primaryFields)
		);
	}
}

function JSONFields(messageQueueStore: MessageQueueStore) {
	return <JSONFields2 messageQueueStore={messageQueueStore}></JSONFields2>
}

export default JSONFields;