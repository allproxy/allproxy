import { FormControlLabel, IconButton, List, ListItem, Modal, Radio, RadioGroup, Tab, Tabs } from '@material-ui/core';
import JSONLogStore, { JSON_FIELDS_DIR, SCRIPTS_DIR } from '../store/JSONLogStore';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import TabContext from '@material-ui/lab/TabContext';
import TabPanel from '@material-ui/lab/TabPanel';
import React from 'react';
import _ from 'lodash';
import JSONFieldValues from './JSONFieldValues';
import { messageQueueStore } from '../store/MessageQueueStore';
import { filterStore } from '../store/FilterStore';

type Props = {
	open: boolean,
	onClose: () => void,
	store: JSONLogStore,
	jsonFields: { name: string, count: number, selected: boolean }[]
}
const SHOW_JSON_FIELD_VALUES = 'Show JSON Field Values';
const TAB_NAMES: { [key: string]: string } = {};
TAB_NAMES[JSON_FIELDS_DIR] = 'Annotate JSON Fields';
TAB_NAMES[SCRIPTS_DIR] = 'Extract Date, Level, App Name and Message';
TAB_NAMES[SHOW_JSON_FIELD_VALUES] = SHOW_JSON_FIELD_VALUES;

const JSONFieldsModal = observer(({ open, onClose, store, jsonFields }: Props) => {
	const TAB_VALUES = [JSON_FIELDS_DIR, SCRIPTS_DIR, SHOW_JSON_FIELD_VALUES];
	const [tabValue, setTabValue] = React.useState(JSON_FIELDS_DIR);
	const [error, setError] = React.useState('');
	const [radioValue, setRadioValue] = React.useState('table');

	function handleTabChange(_e: React.ChangeEvent<{}>, tabValue: string) {
		setTabValue(tabValue);
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
											<div style={{ fontSize: 'small' }}>
												Define Javascript function to return date, level, app name, message and additional JSON data.
											</div>
											{error !== '' &&
												<div style={{ color: 'white', background: 'red', padding: '.25rem' }}>{error}</div>
											}
											<div>
												<button className="btn btn-sm btn-primary"
													onClick={() => store.resetScriptToDefault()}
												>
													Reset to default
												</button>
												<div style={{ marginTop: '.25rem' }}>
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
										</>
										: tabValue === SHOW_JSON_FIELD_VALUES ?
											<JSONFieldValues jsonFields={jsonFields} />
											:
											<>
												<RadioGroup
													row
													aria-labelledby="json-fields-radio-buttons"
													defaultValue="table"
													name="json-fields-radio-buttons"
													value={radioValue}
													onChange={(e) => setRadioValue(e.target.value)}
												>
													<FormControlLabel value="table" control={<Radio />} label="Table" />
													<FormControlLabel value="copypaste" control={<Radio />} label="Copy/Paste" />
												</RadioGroup>
												{radioValue === 'copypaste' ?
													<>
														<div>One JSON field name per line:</div>
														<div style={{ marginTop: '.25rem' }} >
															<textarea
																rows={29} cols={80}
																value={store.getJSONFieldNames().join('\n')}
																onChange={(e) => {
																	store.setJSONFieldNames(e.target.value);
																}}
															/>
														</div>
													</>
													:
													<>
														<button className="btn btn-lg btn-primary"
															onClick={handleAddEntry}
														>
															+ New JSON Key
														</button>
														<List>
															{store.getJSONFields().map((jsonField, i) => (
																<ListItem key={i}
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
																			style={{
																				background: jsonField.isValidName()
																					? undefined
																					: 'lightCoral'
																			}}
																			value={jsonField.getName()}
																			onChange={(e) => jsonField.setNameAndValidate(e.currentTarget.value)} />
																	</div>
																</ListItem>
															))}
														</List>
													</>}
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
		if (filterStore.isFiltered(messageStore)) continue;
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