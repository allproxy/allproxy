import { IconButton, List, ListItem, Modal } from '@material-ui/core'
import NoCaptureStore from '../store/NoCaptureStore';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import CloseIcon from "@material-ui/icons/Close";

type Props = {
	open: boolean,
	onClose: () => void,
	store: NoCaptureStore,
};
const NoCaptureModal = observer(({ open, onClose, store }: Props) => {
	const [saveDisabled, setSaveDisabled] = useState(true);

	function close() {
		setSaveDisabled(true);
		store.init();
		onClose();
	}

	function onSave() {
		store.save();
		close();
	}

	function handleAddClient() {
		store.extend();
	}

	function handleDeleteClient(i: number) {
		setSaveDisabled(false);
		store.deleteEntry(i);
	}

	function onChange(e: any, i: number) {
		setSaveDisabled(false);
		store.updateEntry(i, e.target.value);
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
					<h3>Client No Capture List</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="no-capture-modal__scroll-container">
							<div><strong>Do not capture messages from these clients.</strong></div>
							<div>(The list is stored in browser local storage.)</div>
							<button className="btn btn-lg btn-primary"
								style={{ marginTop: '1rem' }}
								onClick={handleAddClient}
							>
								+ New Client
							</button>
							<List>
								{store.getClientList().map((clientHost, i) => (
									<ListItem key={i}
										style={{ display: 'flex', alignItems: 'center' }}>
										<IconButton onClick={() => handleDeleteClient(i)} title="Remove client">
											<CloseIcon style={{ color: 'red' }} />
										</IconButton>
										<input className="form-control"
											placeholder="Client host or IP (regex allowed)"
											value={clientHost}
											onChange={(e) => onChange(e, i)}
										/>
									</ListItem>
								))}
							</List>
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-secondary"
							onClick={close}
						>
							Cancel
						</button>
						<button type="button" className="settings-modal__cancel btn btn-success"
							disabled={saveDisabled}
							onClick={onSave}
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</Modal >
	);
});

export default NoCaptureModal;