import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { formatJSONPrimaryFields } from '../ImportJSONFile';
import { pickButtonStyle } from '../PickButtonStyle';
import MessageQueueStore from '../store/MessageQueueStore';

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
						updatePrimaryJSONFields(messageQueueStore);
					}}
				>
					{field.name}
				</button>
			))}
		</div >
	)
});

function updatePrimaryJSONFields(messageQueueStore: MessageQueueStore) {
	for (const message of messageQueueStore.getMessages()) {
		let nonJSON = '';
		const i = message.getMessage().url?.indexOf('<span');
		if (i !== -1) {
			nonJSON = message.getMessage().url?.substring(0, i) + ' ';
		}
		const selectedFields: string[] = [];
		const fields = messageQueueStore.getJsonPrimaryFields();
		for (const key in fields) {
			if (fields[key].selected) {
				selectedFields.push(fields[key].name)
			}
		}
		message.setUrl(nonJSON + formatJSONPrimaryFields(message.getMessage().responseBody as { [key: string]: string }, selectedFields));
	}
}

function JSONFields(messageQueueStore: MessageQueueStore) {
	return <JSONFields2 messageQueueStore={messageQueueStore}></JSONFields2>
}

export default JSONFields;