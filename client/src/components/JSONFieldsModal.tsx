import { IconButton, List, ListItem, Modal } from '@material-ui/core'
import JSONFieldsStore, { JSONField } from '../store/JSONFieldsStore';
import { observer } from 'mobx-react-lite';
import CloseIcon from "@material-ui/icons/Close";

type Props = {
	open: boolean,
	onClose: () => void,
	store: JSONFieldsStore,
};
const JSONFieldsModal = observer(({ open, onClose, store }: Props) => {
	function close() {
		onClose();
	}

	function handleAddJSONField() {
		store.extend();
	}

	function handleDeleteJSONField(i: number) {
		store.deleteEntry(i)
	}

	function handleToggleEnable(jsonField: JSONField) {
		jsonField.toggleEnabled();
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
					<h3>Highlight JSON Log Viewer Fields</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="no-capture-modal__scroll-container">
							<h5>
								Define JSON fields that should be highlighted in the JSON log viewer
							</h5>
							<button className="btn btn-lg btn-primary"
								onClick={handleAddJSONField}
							>
								+ New JSON Field
							</button>
							<List>
								{store.getJSONFields().map((jsonField, i) => (
									<ListItem key={i}
										style={{
											display: 'flex', alignItems: 'center',
										}}>
										<IconButton onClick={() => handleDeleteJSONField(i)} title="Delete JSON field">
											<CloseIcon style={{ color: 'red' }} />
										</IconButton>
										<button className={`btn ${jsonField.isEnabled() ? 'btn-success' : 'btn-secondary'}`}
											onClick={() => handleToggleEnable(jsonField)}
											title={jsonField.isEnabled() ? 'Disable breakpoint' : 'Enable breakpoint'}
										>
											{jsonField.isEnabled() ? 'Disable' : 'Enable'}
										</button>
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
												disabled={jsonField.isEnabled() ? false : true}
												placeholder="JSON field name (e.g., a.b.c)"
												value={jsonField.getName()}
												onChange={(e) => jsonField.setName(e.currentTarget.value)}
											/>
										</div>
									</ListItem>
								))}
							</List>
						</div>
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