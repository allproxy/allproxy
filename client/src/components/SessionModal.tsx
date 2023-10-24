import { IconButton, List, ListItem, Modal } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import SessionStore from '../store/SessionStore';
import { snapshotStore } from '../store/SnapshotStore';
import React, { useEffect } from 'react';
import DeleteDialog from './DeleteDialog';
import { apFileSystem } from '../store/APFileSystem';

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
	const [pendingDeleteIndex, setPendingDeleteIndex] = React.useState(-1);
	const [searchType, setSearchType] = React.useState<string>('Title');

	useEffect(() => {
		setTitleValue('');
		setSearchValue('');
		setSearchType('Title');
		filterValues.splice(0, filterValues.length);
	}, [open]);

	function close() {
		snapshotStore.setUpdating(false);
		onClose();
	}

	function handleDeleteSession(i: number) {
		setPendingDeleteIndex(i);
		setOpenDeleteDialog(true);
	}

	async function handleRestoreSession(i: number) {
		onClose();
		snapshotStore.setUpdating(true);
		await store.restoreSession(i);
		snapshotStore.setUpdating(false);
	}

	function isFilterValueMatch(sessionName: string) {
		if (filterValues.length === 0) return true;
		for (const value of filterValues) {
			if (sessionName.indexOf(value) !== -1) {
				return true;
			}
		}
		return false;
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
							<div className="no-capture-modal__scroll-container">
								<div style={{ display: 'flex', marginTop: '1rem' }}>

									<select className="form-control btn btn-primary"
										disabled={snapshotStore.isUpdating()}
										style={{ width: '7rem' }}
										onChange={e => {
											setSearchType(e.target.value);
											if (e.target.value === 'Title') {
												setFilterValues([titleValue]);
											}
										}}
										value={searchType}
									>
										<option selected={searchType === 'Title'}>Title</option>
										<option selected={searchType === 'Full Text'}>Full Text</option>
									</select>

									{searchType === 'Title' ?
										<input type="search" className="form-control"
											onChange={(e) => {
												setTitleValue(e.target.value);
												setFilterValues([e.target.value]);
											}}
											value={titleValue} />
										:
										<input type="search" className="form-control"
											placeholder="Hit enter to search"
											disabled={snapshotStore.isUpdating()}
											onChange={(e) => setSearchValue(e.target.value)}
											onKeyUp={async (e) => {
												if (e.keyCode === 13) {
													if (searchValue === '') {
														setFilterValues([]);
													} else {
														snapshotStore.setUpdating(true);
														//console.log('enter');
														apFileSystem.grepDir('sessions', searchValue)
															.then((files) => {
																//console.log(files);
																if (Array.isArray(files)) {
																	const values: string[] = [];
																	for (const file of files) {
																		const value = file.split('/')[1];
																		values.push(value);
																	}
																	setFilterValues(values);
																} else {
																	console.error(files);
																}
																snapshotStore.setUpdating(false);
															})
															.catch((e) => {
																snapshotStore.setUpdating(false);
																console.error(e);
															});
													}
												}
											}}
											value={searchValue} />
									}

								</div>
								<List>
									{store.getSessionList().length === 0 &&
										<div className="center"
											style={{ marginTop: 'calc( 50vh - 72px' }}>
											No saved sessions found
										</div>}
									{store.getSessionList().map((sessionName, i) => (
										(isFilterValueMatch(sessionName)) &&
										<ListItem key={i}
											style={{
												display: 'flex', alignItems: 'center',
											}}>
											<IconButton onClick={() => handleDeleteSession(i)} title="Delete session">
												<CloseIcon style={{ color: 'red' }} />
											</IconButton>
											<button className={`btn btn-success`}
												style={{ marginRight: '1rem' }}
												onClick={() => handleRestoreSession(i)}
											>
												Restore
											</button>
											<div
												style={{
													display: 'flex', alignItems: 'center',
													width: '100%',
												}}
											>
												{sessionName}
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
						console.log('delete', pendingDeleteIndex);
						store.deleteEntry(pendingDeleteIndex);
					}
					setPendingDeleteIndex(-1);
				}} />
		</>
	);
});

export default SessionModal;