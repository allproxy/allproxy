import { Modal } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { snapshotStore } from '../store/SnapshotStore';

type Props = {
	open: boolean,
	onClose: () => void,
};
const NotesModal = observer(({ open, onClose }: Props) => {

	function close() {
		onClose();
	}

	function handleChange(e: any) {
		snapshotStore.setNotes(e.target.value);
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
					<h3>Notes</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<textarea className="no-capture-modal__scroll-container" style={{ width: '100%' }}
							value={snapshotStore.getNotes()}
							onChange={handleChange}
						/>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-success"
							onClick={close}
						>
							Ok
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default NotesModal;