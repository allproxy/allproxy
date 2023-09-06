import { observer } from 'mobx-react-lite';
import { pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';

type Props = {
	message: MessageStore,
};
const JsonLogAnnotator = observer(({ message }: Props) => {

	return (
		<div>
			{makeJSONRequestLabels(message).map((element) => {
				return element;
			})}
		</div>
	);

	function makeJSONRequestLabels(messageStore: MessageStore): JSX.Element[] {
		const message = messageStore.getMessage();

		let elements = formatJSONRequestLabels(messageStore);
		if (elements.length === 0) {
			// Look for embedded JSON object
			let nonJson = message.path ? message.path + ' ' : '';

			elements.push(<span> {nonJson + JSON.stringify(message.responseBody)}</span>);
		}

		let messageText = messageStore.getLogEntry().message;
		if (messageText !== '') {
			elements.unshift(<span className="request__msg-highlight">{messageText}</span>);
		}

		let category = messageStore.getLogEntry().category;
		if (category !== '') {
			//messageStore.setColor(categoryStyle.background);
			let labels: JSX.Element[] = [];
			for (const name of category.split(' ')) {
				const categoryStyle = pickLabelStyle(name);
				labels = labels.concat(makeLabel(name, categoryStyle.background, categoryStyle.color, categoryStyle.filter));
			}
			elements = labels.concat(elements);
		}

		return elements;
	}

	function formatJSONRequestLabels(messageStore: MessageStore): JSX.Element[] {
		let elements: JSX.Element[] = [];
		for (const field of messageStore.getJsonFields()) {
			const style = pickLabelStyle(field.name);
			elements = elements.concat(makeLabel(field.name, style.background, style.color, style.filter, field.value));
		}

		return elements;
	}

	function makeLabel(name: string, background: string, color: string, filter: string, value: any = undefined): JSX.Element[] {
		const v = value === undefined ? '' : typeof value === 'string' ? `"${value}"` : value;

		const className = value !== undefined ? 'json-label' : '';

		const elements: JSX.Element[] = [];
		elements.push(
			<span className={className}
				style={{ color: color, background: background, filter: filter, marginLeft: '.25rem', padding: '0 .25rem', borderRadius: '.25rem', border: `${background} thin solid` }}>{name}</span>);
		if (v !== undefined) {
			elements.push(<span style={{ marginLeft: '.25rem' }}>{v}</span >);
		}
		return elements;
	}
});

export default JsonLogAnnotator;