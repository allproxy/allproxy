import { observer } from 'mobx-react-lite';
import { pickAppNameStyle, pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';
import { jsonLogStore } from '../store/JSONLogStore';

type Props = {
	message: MessageStore,
	maxLogAppNameSize: number,
};
const JsonLogAnnotator = observer(({ message, maxLogAppNameSize }: Props) => {
	return (
		<div className="request__json-annotations">
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

			elements.push(<div style={{ display: 'inline-block', maxHeight: '52px', overflowX: 'hidden', wordBreak: 'break-all', textOverflow: 'ellipsis' }}> {nonJson + JSON.stringify(message.responseBody)}</div>);
		}

		let messageText = messageStore.getLogEntry().message;
		if (messageText !== '') {
			elements.unshift(<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem' }}>{messageText}</div>);
		}

		let appName = messageStore.getLogEntry().appName;
		let appNames: JSX.Element[] = [];
		if (appName !== '') {
			for (const name of appName.split(' ')) {
				const appNameStyle = pickAppNameStyle(name);
				appNames = appNames.concat(
					<div style={{ display: 'inline-block', paddingLeft: '.25rem' }}>
						<div className="json-label"
							style={{ lineHeight: '1.2', display: 'inline-block', filter: appNameStyle.filter, padding: '0 .25rem', color: appNameStyle.color, borderRadius: '.25rem', background: appNameStyle.background }}>
							{name}
						</div>
					</div >);
			}
			const width = maxLogAppNameSize + 'ch';
			elements.unshift(
				<div style={{ display: 'inline-block', minWidth: width }}>
					{appNames}
				</div>);
		}

		return elements;
	}

	function formatJSONRequestLabels(messageStore: MessageStore): JSX.Element[] {
		let elements: JSX.Element[] = [];
		for (const field of messageStore.getJsonFields()) {
			const style = pickLabelStyle(field.name);
			const bg = style.background;
			elements = elements.concat(makeLabel(field.name, `${bg} thin solid`, style.background, style.color, style.filter, field.value));
		}

		return elements;
	}

	function makeLabel(name: string, border: string, background: string, color: string, filter: string, value: string | number | boolean): JSX.Element[] {
		if (value === '') value = '""';

		let width: string | undefined;
		if ((value + '').length < 100) {
			const smallChars = ['.', ':', '/', '!', ',', ';', "'"];
			let smallCount = 0;
			for (const char of value + '') {
				if (smallChars.includes(char)) {
					++smallCount;
				}
			}
			if (smallCount == 1) smallCount = 0;
			width = ((value + '').length - smallCount) + 'ch';
		}

		const showValue = !jsonLogStore.isFieldHidden(name);
		const bg = background;
		const opacity = showValue ? 1 : .3;
		const displayName = showValue
			? name
			: name.length > 3 ? name.substring(0, 3) + "..." : name;

		const elements: JSX.Element[] = [];
		const element =
			<div style={{ display: 'inline-block', paddingLeft: '.25rem' }}>
				<div style={{ display: 'inline-block' }}>
					<div className="json-label"
						style={{ opacity: opacity, lineHeight: '1.2', display: 'inline-block', color: color, background: bg, filter: filter, padding: '0 .25rem', borderRadius: '.25rem', border: `${border}` }}
					//title={showValue ? 'Click to hide value' : 'Click to show value'}
					//onClick={(e) => toggleHiddenField(e, name)}
					>
						{displayName}
					</div>
				</div>
				{showValue &&
					<div className="json-value" style={{ display: 'inline-block', marginLeft: '.25rem', minWidth: width }}>{value}</div >
				}
			</div >;
		elements.push(element);
		return elements;
	}

	// function toggleHiddenField(event: any, field: string) {
	// 	event.stopPropagation();
	// 	jsonLogStore.toggleHiddenField(field);
	// }
});

export default JsonLogAnnotator;