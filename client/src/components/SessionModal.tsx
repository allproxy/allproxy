import { FormControlLabel, IconButton, List, ListItem, Modal, Radio, RadioGroup } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import SessionStore from '../store/SessionStore';
import { mainTabStore } from '../store/MainTabStore';
import React, { useEffect } from 'react';
import DeleteDialog from './DeleteDialog';
import { apFileSystem } from '../store/APFileSystem';
import ExportDialog from './ExportDialog';
import GTag from '../GTag';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SessionStore,
};
const SessionModal = observer(({ open, onClose, store }: Props) => {
	const [filterValues, setFilterValues] = React.useState<string[]>([]);
	const [titleValue, setTitleValue] = React.useState('');
	const [searchValue, setSearchValue] = React.useState('');
	const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
	const [openExportDialog, setOpenExportDialog] = React.useState(false);
	const [pendingDeleteIndex, setPendingDeleteIndex] = React.useState(-1);
	const [searchType, setSearchType] = React.useState<string>('Title');

	useEffect(() => {
		setTitleValue('');
		setSearchValue('');
		setSearchType('Title');
		filterValues.splice(0, filterValues.length);
	}, [open]);

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
		sessionIndex = i;
		setOpenExportDialog(true);
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

	let sessionIndex = 0;

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
							<div className="no-capture-modal__scroll-container">
								<div style={{ marginTop: '1rem' }}>
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
																.then((files) => {
																	//console.log(files);
																	if (Array.isArray(files)) {
																		const values: string[] = ['does not match'];
																		for (const file of files) {
																			const value = file.split('/')[1];
																			values.push(value);
																		}
																		setFilterValues(values);
																	} else {
																		console.error(files);
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
								<List>
									{store.getSessionList().length === 0 &&
										<div className="center"
											style={{ marginTop: 'calc( 50vh - 72px' }}>
											No saved sessions found
										</div>}
									{store.getSessionList().map((entry, i) => (
										(isFilterValueMatch(entry.name)) &&
										<ListItem key={i}
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
												style={{ marginRight: '1rem' }}
												onClick={() => handleExportSession(i)}
											>
												Export
											</button>
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
				</div>
			</Modal><DeleteDialog
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
		</>
	);
});

export default SessionModal;