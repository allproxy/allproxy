import { observer } from 'mobx-react-lite';
import { Modal } from '@material-ui/core'
import MessageStore from '../store/MessageStore';
import ReactJson, { InteractionProps } from 'react-json-view';

type Props = {
	open: boolean,
	onClose: () => void,
	store: MessageStore,
};
const BreakpointResponseModal = observer(({ open, onClose, store }: Props) => {
	const message = store.getMessage();
	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={onClose}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="settings-modal">
				<div>
					<h3 className="modal-title">Breakpoint: Edit Response</h3>
					<div className="modal-body">
						<div dangerouslySetInnerHTML={{ __html: message.method + " " + store.getRequestUrl() }} />
						<hr />
						<h4>JSON Response Body:</h4>
						<div className="resend-modal__body-container">
							{message.responseBody && typeof message.responseBody === 'object' ?
								<ReactJson
									src={message.responseBody}
									name={false}
									displayDataTypes={false}
									quotesOnKeys={false}
									onEdit={handleEdit}
									onAdd={handleAdd}
									onDelete={handleDelete}
								/>
								:
								<textarea className="resend-modal__body form-control" rows={100} cols={300}
									onChange={(e) => message.responseBody = e.target.value}
									value={message.responseBody as string}
									placeholder="Enter response body" />
							}
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-default btn-default"
							onClick={onClose}
						>
							Cancel
						</button>
						<button type="button" className="resend-modal__send btn btn-default btn-success"
							onClick={onClose}
						>
							Ok
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);

	function handleEdit(props: InteractionProps) {
		message.responseBody = props.updated_src;
		return true;
	}

	function handleAdd(props: InteractionProps) {
		message.responseBody = props.updated_src;
		return true;
	}

	function handleDelete(props: InteractionProps) {
		message.responseBody = props.updated_src;
		return true;
	}
})

export default BreakpointResponseModal;