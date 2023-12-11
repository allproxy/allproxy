import { observer } from 'mobx-react-lite';
import { pickCategoryAppNameStyle as pickCatAppNameStyle, pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';
import { Accordion, AccordionSummary, AccordionDetails } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { themeStore } from '../store/ThemeStore';
import { filterStore } from '../store/FilterStore';
import { jsonLogStore } from '../store/JSONLogStore';

type Props = {
	message: MessageStore,
};
const JsonLogAnnotator = observer(({ message }: Props) => {
	const highlightColor = 'red';
	const hightlightWidth = 'medium';
	return (
		<div className="request__json-annotations">
			{makeJSONRequestLabels(message).map((element) => {
				return element;
			})}
		</div>
	);

	function makeJSONRequestLabels(messageStore: MessageStore): JSX.Element[] {
		const message = messageStore.getMessage();

		let catAppName = messageStore.getLogEntry().appName;
		if (messageStore.getLogEntry().category !== '') catAppName = messageStore.getLogEntry().category + ' ' + catAppName;

		let elements = formatJSONRequestLabels(messageStore);
		if (elements.length === 0 && !jsonLogStore.isBriefChecked()) {
			// Look for embedded JSON object
			let nonJson = message.path ? message.path + ' ' : '';

			// elements.push(<div style={{ display: 'inline-block', maxHeight: '52px', overflowX: 'hidden', wordBreak: 'break-all', textOverflow: 'ellipsis' }}> {nonJson + JSON.stringify(message.responseBody)}</div>);

			const value = nonJson + JSON.stringify(message.responseBody);
			if (catAppName.length === 0) {
				const label = 'JSON';
				const style = pickLabelStyle(label);
				const bg = style.background;
				const color = style.color;
				const keyBorder = `${bg} thin solid`;
				const valueBorder = undefined;
				const filter = style.filter;
				elements = elements.concat(makeLabel(label, keyBorder, valueBorder, bg, color, filter, value));
			} else {
				elements.push(accordionValue(value));
			}
		}

		let messageText = messageStore.getLogEntry().message;
		if (messageText !== '') {
			const border = '';
			elements.unshift(<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem', border: border, lineHeight: '1.2' }}> {messageText}</div >);
		}

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
			let highlight = false;
			if (filterStore.isJSONFieldOperandMatch(
				field.name, field.value + '')) {
				highlight = true;
			} else {
				if (jsonLogStore.isBriefChecked() && !jsonLogStore.isBriefField(field.name)) continue;
			}
			const style = pickLabelStyle(field.name);
			const bg = highlight ? 'yellow' : style.background;
			const color = highlight ? 'black' : style.color;
			const keyBorder = highlight ? `${highlightColor} ${hightlightWidth} solid` : `${bg} thin solid`;
			const valueBorder = undefined;
			const filter = highlight ? '' : style.filter;
			elements = elements.concat(makeLabel(field.name, keyBorder, valueBorder, bg, color, filter, field.value));
		}

		return elements;
	}

	function makeLabel(name: string, keyBorder: string, valueBorder: string | undefined, background: string, color: string, filter: string, value: string | number | boolean): JSX.Element[] {
		if (value === '') value = '""';

		if (typeof value === 'boolean') {
			value = value ? 'true' : 'false';
		}

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
						style={{ lineHeight: '1.2', display: 'inline-block', color: color, background: bg, filter: filter, padding: '0 .25rem', borderRadius: '.25rem', border: `${keyBorder}` }}
					>
						{displayName}
					</div>
				</div>
				{typeof value === 'string' && value.length > 500 ?
					accordionValue(value)
					:
					<div className="json-value" style={{ display: 'inline-block', marginLeft: '.25rem', minWidth: width, border: valueBorder }}>{value}</div >
				}
			</div >;
		elements.push(element);
		return elements;
	}

	function accordionValue(value: string) {
		return (
			<div style={{ margin: '.25rem 0 0 1rem' }}>
				< Accordion>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}
						style={{
							backgroundColor: 'transparent', wordBreak: 'break-all'
						}}
					>
						<div style={{ display: 'inline-block', maxHeight: '1.5rem', overflow: 'hidden', backgroundColor: 'transparent', color: '#4ca728' }}> {value}</div>
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
			</div>
		);
	}
});

export default JsonLogAnnotator;