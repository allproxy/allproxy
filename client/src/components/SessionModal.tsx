import { CircularProgress, IconButton, List, ListItem, Modal } from '@material-ui/core'
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";
import SessionStore from '../store/SessionStore';
import React from 'react';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SessionStore,
};
const SessionModal = observer(({ open, onClose, store }: Props) => {
	const [loading, setLoading] = React.useState(false);

	function close() {
		onClose();
	}

	function handleDeleteSession(i: number) {
		store.deleteEntry(i);
	}

	async function handleRestoreSession(i: number) {
		setLoading(true);
		await store.restoreSession(i);
		setLoading(false);
		onClose();
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
							{loading && <CircularProgress className="center" style={{ margin: '0 50%' }} />}
							{!loading &&
								<List>
									{store.getSessionList().length === 0 &&
										<div className="center"
											style={{ marginTop: 'calc( 50vh - 72px' }}>
											No saved sessions found
										</div>
									}
									{store.getSessionList().map((sessionName, i) => (
										<ListItem key={i}
											style={{
												display: 'flex', alignItems: 'center',
											}}>
											<IconButton onClick={() => handleDeleteSession(i)} title="Delete breakpoint">
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
								</List>}
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