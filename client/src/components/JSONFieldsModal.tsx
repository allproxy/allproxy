import { IconButton, List, ListItem, Modal, Tab, Tabs } from '@material-ui/core'
import JSONLogStore, { JSON_FIELDS_DIR, LOG_CATEGORY_DIR } from '../store/JSONLogStore';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import TabContext from '@material-ui/lab/TabContext';
import TabPanel from '@material-ui/lab/TabPanel';
import React from 'react';

type Props = {
	open: boolean,
	onClose: () => void,
	store: JSONLogStore,
};

const TAB_NAMES: { [key: string]: string } = {}
TAB_NAMES[LOG_CATEGORY_DIR] = 'Define Categories';
TAB_NAMES[JSON_FIELDS_DIR] = 'Highlight JSON Fields';

const JSONFieldsModal = observer(({ open, onClose, store }: Props) => {
	const TAB_VALUES = [LOG_CATEGORY_DIR, JSON_FIELDS_DIR];
	const [tabValue, setTabValue] = React.useState(LOG_CATEGORY_DIR);

	function handleTabChange(_e: React.ChangeEvent<{}>, tabValue: 'Categories' | 'JSON Fields') {
		setTabValue(tabValue);
	}

	function close() {
		onClose();
	}

	function handleAddEntry() {
		store.extend(tabValue);
	}

	function handleDeleteEntry(i: number) {
		store.deleteEntry(i, tabValue)
	}

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={close}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="no-capture-modal" role="dialog">
				<div>
					<h3>Annotate JSON Log Viewer</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<TabContext value={tabValue}>
							<Tabs
								value={tabValue}
								onChange={handleTabChange}
								indicatorColor="primary"
								textColor="primary"
								aria-label="Annotate JSON Log">
								{TAB_VALUES.map(value => (
									<Tab value={value}
										label={
											<div>
												<span style={{ marginLeft: '.25rem', color: 'black' }}>{TAB_NAMES[value]}</span>
											</div>
										}>
									</Tab>
								))}
							</Tabs>
							{TAB_VALUES.map(tabValue => (
								<TabPanel value={tabValue} key={tabValue}>
									<div className="no-capture-modal__scroll-container">
										{tabValue === JSON_FIELDS_DIR &&
											<div style={{ fontSize: 'small' }}>
												<pre>
													Enter <b>a.b</b> to highlight multi-level JSON:
													<br></br>
													{JSON.stringify({ a: { b: "value" } }, null, "  ")}
												</pre>
												<pre>
													Enter <b>x[period]y</b> to highlight JSON with period in name:
													<br></br>
													{JSON.stringify({ "x.y": "value" }, null, "  ")}
												</pre>
											</div>
										}
										<button className="btn btn-lg btn-primary"
											onClick={handleAddEntry}
										>
											{tabValue === JSON_FIELDS_DIR ? '+ New JSON Field' : '+ New Category'}
										</button>
										<List>
											{store.getJSONLabels(tabValue).map((jsonField, i) => (
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
															onChange={(e) => jsonField.setName(e.currentTarget.value)}
														/>
													</div>
												</ListItem>
											))}
										</List>
									</div>
								</TabPanel>
							))}
						</TabContext>
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
		</Modal>
	);
});

export default JSONFieldsModal;