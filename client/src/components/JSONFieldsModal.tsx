import { Checkbox, IconButton, List, ListItem, Modal } from '@material-ui/core';
import JSONLogStore, { JSON_FIELDS_DIR, SCRIPTS_DIR, jsonLogStore } from '../store/JSONLogStore';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import React from 'react';
import _ from 'lodash';
import JSONspreadsheet from './JSONSpreadsheet';
import { messageQueueStore } from '../store/MessageQueueStore';
import JSONFieldsMethod from './JSONParsingMethod';
import JSONSimpleFields from './JSONSimpleFields';
import { filterStore } from '../store/FilterStore';
import GTag from '../GTag';
import EditorJS from './EditorJS';

type Props = {
	open: boolean,
	onClose: () => void,
	store: JSONLogStore,
	jsonFields: { name: string, count: number, selected: boolean }[],
	selectTab: 'jsonFields' | 'scripts' | 'showFields'
}
const SHOW_JSON_FIELD_VALUES = 'showFields';
const TAB_NAMES: { [key: string]: string } = {};
TAB_NAMES[JSON_FIELDS_DIR] = 'Favorite JSON Fields';
TAB_NAMES[SCRIPTS_DIR] = 'Date, Level, Kind, Message...';
TAB_NAMES[SHOW_JSON_FIELD_VALUES] = 'Spreadsheet';

const JSONFieldsModal = observer(({ open, onClose, store, jsonFields, selectTab }: Props) => {
	const [error, setError] = React.useState('');

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
					<div className="json-fields-modal__scroll-container">
						{selectTab === JSON_FIELDS_DIR &&
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
						{selectTab === SCRIPTS_DIR ?
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
														onClick={() => {
															store.resetScriptToDefault();
														}}
													>
														Reset to default
													</button>
													<p></p>
													<EditorJS rerender={store.getRerenderEditor()} />
												</div>
											</div>
										</>
								}
							</>
							: selectTab === SHOW_JSON_FIELD_VALUES ?
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
															<div style={{ lineHeight: '38px' }}>Always show this field</div>
														</div>
													</div>
												</div>
											</ListItem>
										))}
									</List>
								</>
						}
					</div>
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