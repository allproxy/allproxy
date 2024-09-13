import { observer } from 'mobx-react-lite';
import { pickCategoryKindStyle as pickCatKindStyle, pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';
import { Accordion, AccordionSummary, AccordionDetails } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { themeStore } from '../store/ThemeStore';
import { filterStore } from '../store/FilterStore';
import { JsonField, jsonLogStore } from '../store/JSONLogStore';
import { mainTabStore } from '../store/MainTabStore';
import { messageQueueStore } from '../store/MessageQueueStore';

const maxValueSize = 500;

type Props = {
	message: MessageStore,
};
const JsonLogAnnotator = observer(({ message }: Props) => {
	const highlightColor = 'red';
	const highlightWidth = 'thin';
	const layout = mainTabStore.getLayout(mainTabStore.getSelectedTabName());

	return (
		<div className={'request__json-annotations' + (layout?.isNowrap() ? ' nowrap' : '')}>
			{
				jsonLogStore.isRawJsonChecked() ?
					<div style={{ display: 'inline-block', paddingLeft: '.25rem', wordBreak: 'break-all' }}>
						{makeCatAppElement(message.getLogEntry().category, message.getLogEntry().kind)}
						{mainTabStore.copyMessage(message)}
					</div>
					: messageQueueStore.getLayout() !== 'Default' ?
						messageQueueStore.getLayout() === 'Raw Response' ?
							<div style={{ display: 'inline-block', paddingLeft: '.25rem', wordBreak: 'break-all' }}>
								{makeCatAppElement(message.getMessage().status + '', message.getMessage().method + "")}
								{<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem', lineHeight: '1.2', wordBreak: 'break-all' }}> {message.getUrl()}</div >}
								{JSON.stringify(message.getMessage().responseBody).replace(/\\"/g, '')}
							</div>
							:
							makeJSONRequestLabels(message, message.getMessage().status + '', message.getMessage().method + '').map((element) => {
								return element;
							})
						:
						makeJSONRequestLabels(message, message.getLogEntry().category, message.getLogEntry().kind).map((element) => {
							return element;
						})
			}
		</div>
	);

	function makeCatAppElement(category: string, kind: string): JSX.Element {
		let catKinds: JSX.Element[] = [];
		for (const name of [category, kind]) {
			if (name === '') continue;
			const catKindStyle = pickCatKindStyle(name);
			catKinds = catKinds.concat(
				<div style={{ display: 'inline-block', paddingLeft: '.25rem' }}>
					<div className="json-label"
						style={{ lineHeight: '1.2', display: 'inline-block', filter: catKindStyle.filter, padding: '0 .25rem', color: catKindStyle.color, borderRadius: '.25rem', background: catKindStyle.background }}>
						{name}
					</div>
				</div >);
		}

		if (catKinds.length === 0) return <></>;

		return (
			<div style={{ display: 'inline-block', marginRight: '2rem' }}>
				{catKinds}
				<b> :</b>
			</div>
		);
	}

	function makeJSONRequestLabels(messageStore: MessageStore, category: string, kind: string): JSX.Element[] {
		const message = messageStore.getMessage();

		let elements = formatJSONRequestLabels(messageStore);
		if (elements.length === 0 && messageQueueStore.getLayout() === 'Default' &&
			(!jsonLogStore.isBriefChecked() || messageStore.getJsonFields().length === 0)) {
			// Look for embedded JSON object
			let nonJson = message.path ? message.path + ' ' : '';

			// elements.push(<div style={{ display: 'inline-block', maxHeight: '52px', overflowX: 'hidden', wordBreak: 'break-all', textOverflow: 'ellipsis' }}> {nonJson + JSON.stringify(message.responseBody)}</div>);

			const value = nonJson + JSON.stringify(message.responseBody);
			if ((category.length + kind.length === 0) || !messageStore.getLogEntry().message) {
				const label = '';
				const style = pickLabelStyle(label);
				const bg = style.background;
				const color = style.color;
				const keyBorder = `${bg} thin solid`;
				const valueBorder = undefined;
				const filter = style.filter;
				elements = elements.concat(makeLabel(label, keyBorder, valueBorder, bg, color, filter, value));
			} else {
				//elements.push(accordionValue(value));
			}
		}

		let messageText = messageQueueStore.getLayout() !== 'Default' ? message.url : messageStore.getLogEntry().message;
		if (messageText !== '') {
			const border = '';
			elements.unshift(<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem', border: border, lineHeight: '1.2', wordBreak: 'break-all' }}> {messageText}</div >);
		}

		if (category.length + kind.length > 0) {
			elements.unshift(makeCatAppElement(category, kind));
		}

		return elements;
	}

	function formatJSONRequestLabels(messageStore: MessageStore): JSX.Element[] {

		let elements: JSX.Element[] = [];
		const searchMatches: string[] = [];

		if (filterStore.getFilter().length > 0 || filterStore.getHighlightTerms().length > 0) {
			const matchValueMap: { [key: string]: boolean } = {};
			const matchInMiddleMap: { [key: string]: JsonField } = {};
			const fieldsMap = messageStore.getAllJsonFieldsMap();
			let matchInMiddle: JsonField | undefined;
			for (const key in fieldsMap) {
				const field = fieldsMap[key];
				let operand: string | false;
				if ((operand = filterStore.isJSONFieldOperandMatch(field.name, field.value + ''))) {

					const operandLower = operand.toLowerCase();
					const fieldNameLower = (field.name + '').toLowerCase();
					const fieldValueLower = (field.value + '').toLowerCase();

					//console.log(operandLower, fieldNameLower, fieldValueLower);
					const tokens = fieldNameLower.split('.');
					const lastName = tokens[tokens.length - 1];
					if (operand === '*' ||
						fieldValueLower.startsWith(operandLower) || fieldValueLower.endsWith(operandLower) ||
						fieldValueLower === operandLower) {
						// Disable code that only shows one match
						if (true || !matchValueMap[fieldValueLower]) {
							addElement(field, true);
							searchMatches.push(field.name.toLowerCase());
							matchValueMap[fieldValueLower] = true;
						}
						continue;
					} else if (lastName.startsWith(operandLower) || lastName.endsWith(operandLower)) {
						addElement(field, true);
					}

					if (typeof field.value === 'string' && field.value.length > maxValueSize) {
						const i = field.value.indexOf(operand);
						let value: string;
						if (i + operand.length < maxValueSize) {
							value = field.value.substring(0, maxValueSize) + '...';
						} else if (field.value.length - i > maxValueSize) {
							value = '...' + field.value.substring(i, i + maxValueSize) + '...';
						} else {
							value = '...' + field.value.substring(i);
						}
						matchInMiddle = { name: field.name, value: value };
					} else {
						matchInMiddleMap[operand] = field;
					}
				}
			}
			if (elements.length === 0) {
				if (Object.keys(matchInMiddleMap).length > 0) {
					for (const key in matchInMiddleMap) {
						addElement(matchInMiddleMap[key], true);
						searchMatches.push(matchInMiddleMap[key].name.toLowerCase());
					}
				} else {
					if (matchInMiddle) {
						addElement(matchInMiddle as JsonField, true);
						searchMatches.push(matchInMiddle.name.toLowerCase());
					}
				}
			}
		}

		for (const field of messageStore.getJsonFields()) {
			if (jsonLogStore.isBriefChecked() && !jsonLogStore.isBriefField(field.name)) continue;
			if (searchMatches.indexOf(field.name.toLowerCase()) !== -1) continue;
			addElement(field, false);
		}

		// Show less is checked and no JSON fields were added?
		if (jsonLogStore.isBriefChecked() && elements.length === 0 && Object.keys(jsonLogStore.getBriefMap()).length === 0) {
			for (const field of messageStore.getJsonFields()) {
				addElement(field, false);
			}
		}

		function addElement(field: JsonField, highlight: boolean) {
			const style = pickLabelStyle(field.name);
			const bg = highlight ? '#FFFF00' : style.background;
			const color = highlight ? 'black' : style.color;
			const keyBorder = highlight ? `${highlightColor} ${highlightWidth} solid` : `${bg} thin solid`;
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
				{name.length > 0 &&
					<div style={{ display: 'inline-block' }}>
						<div className="json-label"
							style={{ lineHeight: '1.2', display: 'inline-block', color: color, background: bg, filter: filter, padding: '0 .25rem', borderRadius: '.25rem', border: `${keyBorder}` }}
						>
							{displayName}
						</div>
					</div>
				}
				{typeof value === 'string' && value.length > maxValueSize + 6 ?
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