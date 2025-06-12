import { Checkbox, FormControlLabel, IconButton, List, ListItem, Modal, Radio, RadioGroup, Tab, Tabs, Tooltip } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import SessionStore from '../store/SessionStore';
import { mainTabStore } from '../store/MainTabStore';
import React, { useEffect } from 'react';
import DeleteDialog from './DeleteDialog';
import { apFileSystem } from '../store/APFileSystem';
import ExportDialog from './ExportDialog';
import GTag from '../GTag';
import { TabContext, TabPanel } from '@material-ui/lab';
import SessionDialog from './SessionDialog';
import InfoIcon from '@mui/icons-material/Info';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SessionStore,
};
const SessionModal = observer(({ open, onClose, store }: Props) => {
	const [openSaveSessionDialog, setOpenSaveSessionDialog] = React.useState(false);
	const [filterValues, setFilterValues] = React.useState<string[]>([]);
	const [filterMatches, setFilterMatches] = React.useState<{ [key: string]: string }>({});
	const [titleValue, setTitleValue] = React.useState('');
	const [searchValue, setSearchValue] = React.useState('');
	const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
	const [openExportDialog, setOpenExportDialog] = React.useState(false);
	const [pendingDeleteIndex, setPendingDeleteIndex] = React.useState(-1);
	const [searchType, setSearchType] = React.useState<'Title' | 'Full Text'>('Full Text');
	const [sessionIndex, setSessionIndex] = React.useState(0);
	const [flatten, setFlatten] = React.useState(true);

	useEffect(() => {
		setTitleValue('');
		setSearchValue('');
		setSearchType('Full Text');
		filterValues.splice(0, filterValues.length);
		setFilterMatches({});
	}, [open]);

	function handleTabChange(_e: React.ChangeEvent<{}>, value: string) {
		store.setSelectedTab(value);
	}

	function close() {
		mainTabStore.setUpdating(false);
		onClose();
		GTag.pageView('SessionModal count=' + store.getSessionList().length);
	}

	function handleDeleteSession(i: number) {
		setPendingDeleteIndex(i);
		setOpenDeleteDialog(true);
	}

	async function handleRestoreSession(i: number) {
		onClose();
		mainTabStore.setUpdating(true);
		await store.restoreSession(i);
		mainTabStore.setUpdating(false);
	}

	async function handleExportSession(i: number) {
		setSessionIndex(i);
		setOpenExportDialog(true);
	}

	async function handleChangeCategory(i: number) {
		setSessionIndex(i);
		setOpenSaveSessionDialog(true);
	}

	function isFilterValueMatch(sessionName: string) {
		if (filterValues.length === 0) return true;
		for (const value of filterValues) {
			if (sessionName.toLowerCase().indexOf(value.toLowerCase()) !== -1) {
				return true;
			}
		}
		return false;
	}

	function getCategoryCount(category: string) {
		let count = 0;
		for (const entry of store.getSessionList()) {
			if ((flatten || entry.category === category) && isFilterValueMatch(entry.name)) ++count;
		}
		return count;
	}

	function getTabs() {
		return flatten ? ['default'] : store.getCategories();
	}

	function handleFlattenChange() {
		if (flatten) {
			store.setSelectedTab(store.getCategories()[0]);
		} else {
			store.setSelectedTab('default');
		}
		setFlatten(!flatten);
	}

	return (
		<>
			<Modal
				className="modal-window"
				open={open}
				onClose={close}
				aria-labelledby="simple-modal-title"
				aria-describedby="simple-modal-description"
			>
				<div className="breakpoint-modal" role="dialog">
					<div>
						<h3>Sessions</h3>
						<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
							{store.getCategories().length > 1 &&
								<>
									<Checkbox style={{ paddingTop: 0, paddingBottom: 0 }}
										size={"small"}
										defaultChecked={flatten}
										value={flatten}
										onChange={handleFlattenChange} />
									Show one list
								</>
							}
							<div className="no-capture-modal__scroll-container">
								<div>
									<div style={{ display: 'flex' }}>
										<h5 style={{ lineHeight: '40px', marginRight: '1rem' }}>Search:</h5>
										<RadioGroup
											row
											aria-labelledby="theme-radio-button"
											defaultValue={searchType}
											value={searchType}
											name="radio-buttons-group"
										>
											<FormControlLabel value="Title" control={<Radio />} label="Title" onClick={() => { setSearchType('Title'); setFilterValues([titleValue]); }} />
											<FormControlLabel value="Full Text" control={<Radio />} label="Full Text" onClick={() => { setSearchType('Full Text'); }} />
										</RadioGroup>
									</div>

									<div>
										{searchType === 'Title' ?
											<input type="search" className="form-control"
												onChange={(e) => {
													setTitleValue(e.target.value);
													setFilterValues([e.target.value]);
												}}
												value={titleValue} />
											:
											<input type="search" className="form-control"
												placeholder="Exact match: hit enter to search"
												disabled={mainTabStore.isUpdating()}
												onChange={(e) => setSearchValue(e.target.value)}
												onKeyUp={async (e) => {
													if (e.keyCode === 13) {
														if (searchValue === '') {
															setFilterValues([]);
														} else {
															mainTabStore.setUpdating(true, 'Searching...');
															//console.log('enter');
															apFileSystem.grepDir('sessions', searchValue)
																.then((results) => {
																	//console.log(files);
																	if (Array.isArray(results)) {
																		const values: string[] = ['does not match'];
																		const matches: { [key: string]: string } = {};
																		for (const result of results) {
																			const value = result.file.split('/')[1];
																			values.push(value);
																			matches[value] = result.match;
																		}
																		values.push(searchValue);
																		setFilterValues(values);
																		setFilterMatches(matches);
																	} else {
																		console.error(results);
																	}
																	mainTabStore.setUpdating(false);
																})
																.catch((e) => {
																	mainTabStore.setUpdating(false);
																	console.error(e);
																});
														}
													}
												}}
												value={searchValue} />
										}
									</div>
								</div>
								<TabContext value={store.getSelectedTab()}>
									<Tabs
										value={store.getSelectedTab()}
										onChange={handleTabChange}
										indicatorColor="primary"
										textColor="primary"
										aria-label="SessionTabs">
										{getTabs().map((tabValue) => (
											getCategoryCount(tabValue) > 0 &&
											< Tab
												key={tabValue}
												value={tabValue}
												label={
													< div className={'maintab__tab'} title={tabValue} >
														<div className="maintab__tab-name">
															{tabValue + ' (' + getCategoryCount(tabValue) + ')'}
														</div>
													</div>
												}>
											</Tab>
										))}
									</Tabs>
									{
										getTabs().map((catValue) => (
											<TabPanel
												key={catValue}
												value={catValue}>
												<List>
													{store.getSessionList().length === 0 &&
														<div className="center"
															style={{ marginTop: 'calc( 50vh - 72px' }}>
															No saved sessions found
														</div>}
													{store.getSessionList().map((entry, i) => (
														((flatten || entry.category === catValue) && isFilterValueMatch(entry.name)) &&
														<ListItem key={entry.name + entry.category}
															style={{
																display: 'flex', alignItems: 'center',
															}}>
															<IconButton
																disabled={!entry.canDelete}
																onClick={() => handleDeleteSession(i)} title="Delete session">
																<CloseIcon style={{ color: 'red', opacity: entry.canDelete ? undefined : 0 }} />
															</IconButton>
															<button className={`btn btn-success`}
																title="Restore session"
																style={{ marginRight: '.25rem' }}
																onClick={() => handleRestoreSession(i)}
															>
																Restore
															</button>
															<button className={`btn btn-primary`}
																title="Export session to zip file"
																style={{ marginRight: '.25rem' }}
																onClick={() => handleExportSession(i)}
															>
																Export
															</button>
															<button className={`btn btn-danger`}
																title="Move this session to different category"
																style={{ marginRight: '.5rem', whiteSpace: 'nowrap' }}
																onClick={() => handleChangeCategory(i)}
															>
																Move
															</button>
															{filterMatches[entry.fileName] &&
																<Tooltip
																	title={<pre style={{ width: '50vw' }}>{filterMatches[entry.fileName]}</pre>}
																>
																	<IconButton>
																		<InfoIcon />
																	</IconButton>
																</Tooltip>
															}
															<div
																style={{
																	display: 'flex', alignItems: 'center',
																	width: '100%',
																}}
															>
																{entry.name}
															</div>
														</ListItem>
													))}
												</List>
											</TabPanel>
										))
									}
								</TabContext >
							</div>
						</div>
						<div className="modal-footer">
							<button type="button" className="settings-modal__cancel btn btn-secondary"
								onClick={close}
							>
								Close
							</button>
						</div>
					</div>
				</div >
			</Modal ><DeleteDialog
				open={openDeleteDialog}
				onClose={(doDelete: boolean) => {
					setOpenDeleteDialog(false);
					if (doDelete) {
						store.deleteEntry(pendingDeleteIndex);
					}
					setPendingDeleteIndex(-1);
				}} />
			<ExportDialog
				open={openExportDialog}
				heading={"Enter ZIP File Name"}
				buttonLabel={'Export'}
				onClose={async (fileName) => {
					setOpenExportDialog(false);
					if (fileName.length > 0) {
						await store.exportSession(sessionIndex, fileName);
					}
				}} />
			<SessionDialog
				open={openSaveSessionDialog}
				title="Move Session"
				onClose={async (_fileName, category) => {
					setOpenSaveSessionDialog(false);
					await store.changeCategory(sessionIndex, category);
					store.setSelectedTab(category);
				}} />
		</>
	);
});

export default SessionModal;