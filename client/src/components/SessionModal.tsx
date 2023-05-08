import { IconButton, List, ListItem, Modal } from '@material-ui/core'
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import SessionStore from '../store/SessionStore';
import { snapshotStore } from '../store/SnapshotStore';
import React from 'react';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SessionStore,
};
const SessionModal = observer(({ open, onClose, store }: Props) => {
	const [filterValue, setFilterValue] = React.useState('');

	function close() {
		onClose();
	}

	function handleDeleteSession(i: number) {
		store.deleteEntry(i);
	}

	async function handleRestoreSession(i: number) {
		onClose();
		snapshotStore.setUpdating(true);
		await store.restoreSession(i);
		snapshotStore.setUpdating(false);
	}

	return (
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
							<input type="search" className="form-control" style={{ marginTop: '1rem' }}
								placeholder="Filter..."
								onChange={(e) => setFilterValue(e.target.value)}
								value={filterValue} />
							<List>
								{store.getSessionList().length === 0 &&
									<div className="center"
										style={{ marginTop: 'calc( 50vh - 72px' }}>
										No saved sessions found
									</div>
								}
								{store.getSessionList().map((sessionName, i) => (
									sessionName.indexOf(filterValue) !== -1 &&
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
		</Modal>
	);
});

export default SessionModal;