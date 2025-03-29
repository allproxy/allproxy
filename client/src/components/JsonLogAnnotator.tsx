import { observer } from 'mobx-react-lite';
import { pickCategoryKindStyle as pickCatKindStyle, pickLabelStyle } from '../PickButtonStyle';
import MessageStore from '../store/MessageStore';
import { Accordion, AccordionSummary, AccordionDetails, MenuItem, Menu } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { themeStore } from '../store/ThemeStore';
import { filterStore } from '../store/FilterStore';
import { JsonField, jsonLogStore, updateJSONRequestLabels } from '../store/JSONLogStore';
import { mainTabStore } from '../store/MainTabStore';
import { messageQueueStore } from '../store/MessageQueueStore';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import StarHalfIcon from '@mui/icons-material/StarHalf';
import React from 'react';
import GTag from '../GTag';

const maxValueSize = 500;

type Props = {
	message: MessageStore,
	className: string,
};
const JsonLogAnnotator = observer(({ message, className }: Props) => {
	const highlightColor = 'red';
	const highlightWidth = 'thin';
	const layout = mainTabStore.getLayout(mainTabStore.getSelectedTabName());

	const [starField, setStarField] = React.useState<string>('');
	const [starMenuDiv, setStarMemuDiv] = React.useState<HTMLDivElement | null>(null);

	function doStar(type: 'full' | 'half') {
		let i = jsonLogStore.getJSONFieldNames().indexOf(starField);
		//console.log('doStar', starField, i);
		GTag.pageView('Star ' + type + ': ' + starField);
		if (i === -1) {
			jsonLogStore.extend();
			i = 0;
		}

		const jsonField = jsonLogStore.getJSONFields()[i];
		jsonField.setNameAndValidate(starField);
		if (type === 'full' !== jsonField.shouldShowWnenBriefChecked()) {
			jsonField.toggleBriefChecked();
		}
		setTimeout(() => {
			updateJSONRequestLabels();
		}, 100);
	}

	async function unStar() {
		GTag.pageView('Un-star: ' + starField);
		const i = jsonLogStore.getJSONFieldNames().indexOf(starField);
		//console.log('unStar', starField, i);
		if (i !== -1) await jsonLogStore.deleteEntry(i);
		setTimeout(() => {
			updateJSONRequestLabels();
		}, 100);
	}

	return (
		<>
			<Menu
				anchorEl={starMenuDiv}
				open={Boolean(starMenuDiv)}
				onClose={() => setStarMemuDiv(null)}
			>
				<MenuItem onClick={() => {
					setStarMemuDiv(null);
					doStar('full');
				}} >
					<StarIcon />Always show field
				</MenuItem>
				<MenuItem onClick={() => {
					setStarMemuDiv(null);
					doStar('half');
				}} >
					<StarHalfIcon />Show when More Detail is checked
				</MenuItem>
				<MenuItem onClick={() => {
					setStarMemuDiv(null);
					unStar();
				}} >
					<StarBorderIcon />Don't show field
				</MenuItem>
			</Menu>
			<div className={'request__json-annotations' + (layout?.isNowrap() ? ' nowrap' : '')}>
				{
					jsonLogStore.isRawJsonChecked()
						? <div style={{ display: 'inline-block', paddingLeft: '.25rem', wordBreak: 'break-all' }}>
							{makeCatAppElement(message.getLogEntry().category, message.getLogEntry().kind)}
							{ }
							<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem', lineHeight: '1.2', wordBreak: 'break-all' }}>
								{message.getLogEntry().message}
							</div >
							<pre className={className}>
								{formatJSON(mainTabStore.copyMessage(message))}
							</pre>
						</div>
						:
						messageQueueStore.getLayout() !== 'Default' ?
							messageQueueStore.getLayout() === 'Raw Response' ?
								<div style={{ display: 'inline-block', paddingLeft: '.25rem', wordBreak: 'break-all' }}>
									{makeCatAppElement(message.getMessage().status + '', message.getMessage().method + "")}
									{<div className="request__msg-highlight" style={{ display: 'inline-block', paddingLeft: '.25rem', paddingRight: '2rem', lineHeight: '1.2', wordBreak: 'break-all' }}> {message.getUrl()}</div>}
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
		</>
	);

	function formatJSON(jsonString: string): string {
		//return jsonString;
		const j = JSON.parse(jsonString);
		return JSON.stringify(j, null, 2);
	}

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

		const elementsMap: { [key: string]: boolean } = {};
		let elements: JSX.Element[] = [];
		const searchMatches: string[] = [];

		const jsonFieldsMap: { [key: string]: true } = {};
		for (const field of messageStore.getJsonFields()) {
			jsonFieldsMap[field.name] = true;
		}

		if (filterStore.getFilter().length > 0 || filterStore.getHighlightJsonFields().length > 0) {
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
					} else if (operand.indexOf('[]') != -1 || lastName.startsWith(operandLower) || lastName.endsWith(operandLower)) {
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
			const style = pickLabelStyle(field.name.split('[')[0]); // Use same color for all array elements
			const bg = highlight ? '#FFFF00' : style.background;
			const color = highlight ? 'black' : style.color;
			const keyBorder = highlight ? `${highlightColor} ${highlightWidth} solid` : `${bg} thin solid`;
			const valueBorder = undefined;
			const filter = highlight ? '' : style.filter;
			if (elementsMap[field.name] === undefined) {
				const star =
					<div onClick={(e) => {
						setStarField(field.name);
						setStarMemuDiv(e.currentTarget);
					}} style={{ display: 'inline-block', opacity: highlight ? 1 : .8 }} title="Click star to change visibility" >
						{
							jsonFieldsMap[field.name] ?
								jsonLogStore.getBriefMap()[field.name] ?
									<StarIcon style={{ fontSize: '.9rem', paddingBottom: '2px' }} /> :
									<StarHalfIcon style={{ fontSize: '.9rem', paddingBottom: '2px' }} />
								:
								<StarBorderIcon style={{ fontSize: '.9rem', paddingBottom: '2px' }} />
						}
					</div >;

				elements = elements.concat(makeLabel(field.name, keyBorder, valueBorder, bg, color, filter, field.value, star));
				elementsMap[field.name] = true;
			}
		}

		return elements;
	}


	function makeLabel(name: string, keyBorder: string, valueBorder: string | undefined, background: string, color: string, filter: string, value: string | number | boolean, star?: JSX.Element): JSX.Element[] {
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
							style={{ textAlign: 'center', lineHeight: '1.2', display: 'inline-block', color: color, background: bg, filter: filter, padding: '0 .25rem', borderRadius: '.25rem', border: `${keyBorder}` }}
						>
							{displayName}
							{star}
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