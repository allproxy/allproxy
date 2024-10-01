import { Checkbox, IconButton, List, ListItem, Modal, Tab, Tabs } from '@material-ui/core';
import JSONLogStore, { JSON_FIELDS_DIR, SCRIPTS_DIR, jsonLogStore } from '../store/JSONLogStore';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import TabContext from '@material-ui/lab/TabContext';
import TabPanel from '@material-ui/lab/TabPanel';
import React from 'react';
import _ from 'lodash';
import JSONspreadsheet from './JSONSpreadsheet';
import { messageQueueStore } from '../store/MessageQueueStore';
import JSONFieldsMethod from './JSONParsingMethod';
import JSONSimpleFields from './JSONSimpleFields';
import { filterStore } from '../store/FilterStore';
import GTag from '../GTag';

type Props = {
	open: boolean,
	onClose: () => void,
	store: JSONLogStore,
	jsonFields: { name: string, count: number, selected: boolean }[],
	selectTab: 'jsonFields' | 'scripts' | 'showFields'
}
const SHOW_JSON_FIELD_VALUES = 'showFields';
const TAB_NAMES: { [key: string]: string } = {};
TAB_NAMES[JSON_FIELDS_DIR] = 'Define JSON Fields';
TAB_NAMES[SCRIPTS_DIR] = 'Date, Level, Kind, Message...';
TAB_NAMES[SHOW_JSON_FIELD_VALUES] = 'Spreadsheet';

const JSONFieldsModal = observer(({ open, onClose, store, jsonFields, selectTab }: Props) => {
	const TAB_VALUES = [JSON_FIELDS_DIR, SCRIPTS_DIR, SHOW_JSON_FIELD_VALUES];
	const [tabValue, setTabValue] = React.useState(selectTab);
	const [error, setError] = React.useState('');

	function handleTabChange(_e: React.ChangeEvent<{}>, tabValue: 'jsonFields' | 'scripts' | 'showFields') {
		setTabValue(tabValue);
		GTag.selectContent('JSONFieldsModal', tabValue);
	}

	function close() {
		try {
			store.updateScriptFunc();
			store.saveScript();
			onClose();
		} catch (e) {
			setError('Syntax syntax.  See console log for more information.');
			console.log(e);
		}
		GTag.pageView('JSONFieldsModal count=' + store.getJSONFields().length);
	}

	function handleAddEntry() {
		store.extend();
	}

	function handleDeleteEntry(i: number) {
		store.deleteEntry(i);
	}

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={close}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="json-log-modal" role="dialog">
				<div>
					<h3>JSON Log Viewer Settings</h3>
					<TabContext value={tabValue}>
						<Tabs
							value={tabValue}
							onChange={handleTabChange}
							indicatorColor="primary"
							textColor="primary"
							aria-label="JSON Log Viewer Settings">
							{TAB_VALUES.map(value => (
								<Tab value={value}
									label={
										<div>
											<span style={{ marginLeft: '.25rem' }}>{TAB_NAMES[value]}</span>
										</div>
									}>
								</Tab>
							))}
						</Tabs>
						{TAB_VALUES.map(tabValue => (
							<TabPanel value={tabValue} key={tabValue}>
								<div className="json-fields-modal__scroll-container">
									{tabValue === JSON_FIELDS_DIR &&
										<div style={{ fontSize: 'small' }}>
											<pre>
												Enter <b>a.b</b> to annotate multi-level JSON:
												<br></br>
												{JSON.stringify({ a: { b: "value" } }, null, "  ")}
											</pre>
											<pre>
												Enter <b>x[.]y</b> to annotate JSON with period in name:
												<br></br>
												{JSON.stringify({ "x.y": "value" }, null, "  ")}
											</pre>
										</div>
									}
									{tabValue === SCRIPTS_DIR ?
										<>
											<JSONFieldsMethod />
											{jsonLogStore.getParsingMethod() === 'simple' ?
												<JSONSimpleFields />
												: jsonLogStore.getParsingMethod() === 'plugin' ?
													<div>
														The date, level, category, kind and message fields are defined by your plugin.  Edit or replace the <code>client/public/plugins/parsejson/plugin.js</code> file, and rebuild the project.
													</div>
													: jsonLogStore.getParsingMethod() === 'advanced' && <>
														Write your own JavaScript to extract the date, level, category, kind and message fields.
														<p></p>
														{error !== '' &&
															<div style={{ color: 'white', background: 'red', padding: '.25rem' }}>{error}</div>
														}
														<div style={{ width: '100%', overflow: 'hidden' }}>
															<div style={{ display: 'inline-block' }}>
																<button className="btn btn-sm btn-primary"
																	onClick={() => store.resetScriptToDefault()}
																>
																	Reset to default
																</button>
																<p></p>
																<div>
																	<textarea
																		rows={29} cols={80}
																		value={store.getScript()}
																		onChange={(e) => {
																			store.setScript(e.target.value);
																			setError('');
																		}}
																	/>
																</div>
															</div>
															<div style={{ display: 'inline-block', margin: '2rem 0 0 2rem', verticalAlign: 'top' }}>
																<h5>Example log message:</h5>
																<pre>
																	<div>{'{'}</div>
																	<div>  "date": "2023-09-12T18:03:33.496Z"</div>
																	<div>  "level": "info"</div>
																	<div>  "zone": "zone1"</div>
																	<div>  "pod_name": "pod-name"</div>
																	<div>  "message": "This is a test message."</div>
																	<div>{'}'}</div>
																</pre>
																<p></p>
																<h5>Example extract function:</h5>
																<pre>
																	<div>// Function called to extract <b>date</b>, <b>level</b>, <b>kind</b> and <b>message</b></div>
																	<div>//</div>
																	<div>// @param <b>preJSONString</b>: string - optional non-JSON string proceeding JSON object</div>
																	<div>// @param <b>jsonObject</b>: {'{}'} - JSON log data</div>
																	<div>// @returns {'{'}<b>date</b>: Date, <b>level</b>: string, <b>kind</b>: string, <b>message</b>: string, <b>rawLine</b>: string{'}'}</div>
																	<div>//</div>
																	<div>// <b>category</b> e.g., availability zone, processor... </div>
																	<div>// <b>kind</b> is the object kind, pod name, process ID... </div>
																	<div>//</div>
																	<div>const myFunction = function(preJSONString, jsonObject) {'{'}</div>
																	<div>  let date = new Date(jsonObject.date);</div>
																	<div>  let level = jsonObject.level;</div>
																	<div>  let category = jsonObject.zone;</div>
																	<div>  let kind = jsonObject.kind;</div>
																	<div>  let message = jsonObject.message;</div>
																	<div>  let rawLine = JSON.stringify(jsonObject);</div>
																	<div>  let additionalJSON = {'{}'};</div>
																	<div>  return {'{date, level, category, kind, message, additionalJSON}'};</div>
																	<div>{'}'}</div>
																</pre>
															</div>
														</div>
													</>
											}
										</>
										: tabValue === SHOW_JSON_FIELD_VALUES ?
											<JSONspreadsheet jsonFields={jsonFields} />
											:
											<>
												<button className="btn btn-lg btn-primary"
													onClick={handleAddEntry}
												>
													+ New JSON Key
												</button>
												<List>
													{store.getJSONFields().map((jsonField, i) => (
														<ListItem key={i + jsonField.getName()}
															style={{
																display: 'flex', alignItems: 'center',
															}}>
															<IconButton onClick={() => handleDeleteEntry(i)} title="Delete JSON field">
																<CloseIcon style={{ color: 'red' }} />
															</IconButton>
															<div
																style={{
																	display: 'flex', alignItems: 'center',
																	width: '100%',
																}}
															>
																<input className="form-control"
																	autoFocus={i === 0}
																	style={{
																		width: '32rem',
																		background: jsonField.isValidName()
																			? undefined
																			: 'lightCoral'
																	}}
																	value={jsonField.getName()}
																	onChange={(e) => jsonField.setNameAndValidate(e.currentTarget.value)} />
																<div>
																	<div style={{ display: 'flex' }}>
																		<Checkbox
																			size="small"
																			checked={jsonField.shouldShowWnenBriefChecked()}
																			onChange={() => jsonField.toggleBriefChecked()} />
																		<div style={{ lineHeight: '38px' }}>Show when <b>Less Detail</b> is checked</div>
																	</div>
																</div>
															</div>
														</ListItem>
													))}
												</List>

											</>
									}
								</div>
							</TabPanel>
						))}
					</TabContext>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-success"
							onClick={close}
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</Modal >
	);
});

export function getJSONFields() {
	const jsonFields: { name: string, count: number, selected: boolean }[] = [];
	const jsonMap: { [key: string]: number } = { Time: 99999, Level: 99999, Message: 99999 };
	for (const messageStore of messageQueueStore.getMessages()) {
		if (messageStore.isFiltered()) continue;

		if (filterStore.getFilter().length > 0 || filterStore.getHighlightJsonFields().length > 0) {
			const fieldsMap = messageStore.getAllJsonFieldsMap();
			for (const key in fieldsMap) {
				const field = fieldsMap[key];
				if (filterStore.isJSONFieldOperandMatch(field.name, field.value + '')
					|| filterStore.isJSONFieldOperandMatch(field.name, '"' + field.value + '"')) {
					if (jsonMap[field.name]) {
						jsonMap[field.name] = ++jsonMap[field.name];
					} else {
						jsonMap[field.name] = 1;
					}
				}
			}
		}

		for (const field of messageStore.getJsonFields()) {
			if (jsonMap[field.name]) {
				jsonMap[field.name] = ++jsonMap[field.name];
			} else {
				jsonMap[field.name] = 1;
			}
		}
	}
	for (const key in jsonMap) {
		jsonFields.push({ name: key, count: jsonMap[key], selected: false });
	}
	jsonFields.sort((a, b) => b.count - a.count);
	return jsonFields;
}

export default JSONFieldsModal;