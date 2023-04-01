import { IconButton, List, ListItem, Modal } from '@material-ui/core'
import JSONFieldsStore from '../store/JSONFieldsStore';
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
					<h3>Highlight JSON Log Viewer Fields</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="no-capture-modal__scroll-container">
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