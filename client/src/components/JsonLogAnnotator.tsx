import { observer } from 'mobx-react-lite';
import { pickCategoryAppNameStyle as pickCatAppNameStyle, pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';
import { Accordion, AccordionSummary, AccordionDetails } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { themeStore } from '../store/ThemeStore';

type Props = {
	message: MessageStore,
};
const JsonLogAnnotator = observer(({ message }: Props) => {
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

			// elements.push(<div style={{ display: 'inline-block', maxHeight: '52px', overflowX: 'hidden', wordBreak: 'break-all', textOverflow: 'ellipsis' }}> {nonJson + JSON.stringify(message.responseBody)}</div>);

			const value = nonJson + JSON.stringify(message.responseBody);
			elements.push(accordionValue(value));
		}

		let messageText = messageStore.getLogEntry().message;
		if (messageText !== '') {
			elements.unshift(<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem' }}>{messageText}</div>);
		}

		let catAppName = messageStore.getLogEntry().appName;
		if (messageStore.getLogEntry().category !== '') catAppName = messageStore.getLogEntry().category + ' ' + catAppName;
		let catAppNames: JSX.Element[] = [];
		if (catAppName !== '') {
			for (const name of catAppName.split(' ')) {
				const catAppNameStyle = pickCatAppNameStyle(name);
				catAppNames = catAppNames.concat(
					<div style={{ display: 'inline-block', paddingLeft: '.25rem' }}>
						<div className="json-label"
							style={{ lineHeight: '1.2', display: 'inline-block', filter: catAppNameStyle.filter, padding: '0 .25rem', color: catAppNameStyle.color, borderRadius: '.25rem', background: catAppNameStyle.background }}>
							{name}
						</div>
					</div >);
			}
			//console.log(width);
			elements.unshift(
				<div style={{ display: 'inline-block', marginRight: '2rem' }}>
					{catAppNames}
					<b> :</b>
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

		const bg = background;
		const displayName = name;

		const elements: JSX.Element[] = [];
		const element =
			<div style={{ display: 'inline-block', paddingLeft: '.25rem' }}>
				<div style={{ display: 'inline-block' }}>
					<div className="json-label"
						style={{ lineHeight: '1.2', display: 'inline-block', color: color, background: bg, filter: filter, padding: '0 .25rem', borderRadius: '.25rem', border: `${border}` }}
					//title={showValue ? 'Click to hide value' : 'Click to show value'}
					//onClick={(e) => toggleHiddenField(e, name)}
					>
						{displayName}
					</div>
				</div>
				{typeof value === 'string' && value.length > 500 ?
					accordionValue(value)
					:
					<div className="json-value" style={{ display: 'inline-block', marginLeft: '.25rem', minWidth: width }}>{value}</div >
				}
			</div >;
		elements.push(element);
		return elements;
	}

	function accordionValue(value: string) {
		return (
			< Accordion onClick={(e) => e.stopPropagation()} >
				<AccordionSummary expandIcon={<ExpandMoreIcon />}
					style={{
						backgroundColor: 'transparent'
					}}
				>
					<div style={{ display: 'inline-block', maxHeight: '1.5rem', overflowX: 'hidden', backgroundColor: 'transparent' }}> {value}</div>
				</AccordionSummary>
				<AccordionDetails>
					<div style={{
						wordBreak: 'break-all',
						backgroundColor: themeStore.getTheme() === 'dark' ? '#333333' : 'whitesmoke',
						color: themeStore.getTheme() === 'dark' ? 'whitesmoke' : undefined,
						padding: '.5rem',
						overflowY: 'auto'
					}}>
						{value}
					</div>
				</AccordionDetails>
			</Accordion>
		);
	}
});

export default JsonLogAnnotator;