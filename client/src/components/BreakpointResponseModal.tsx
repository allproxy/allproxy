import { observer } from 'mobx-react-lite';
import { Modal } from '@material-ui/core';
import MessageStore from '../store/MessageStore';
import ReactJson, { InteractionProps } from 'react-json-view';
import React from 'react';
import { themeStore } from '../store/ThemeStore';
import RequestURL from './RequestURL';

type Props = {
	open: boolean,
	onClose: () => void,
	store: MessageStore,
};
const BreakpointResponseModal = observer(({ open, onClose, store }: Props) => {
	const [responseBody, setResponseBody] = React.useState(store.getMessage().responseBody);
	const [modified, setModified] = React.useState(false);
	const message = store.getMessage();
	const saveResponseBody = JSON.parse(JSON.stringify(message.responseBody));
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
						<div className="modal-full-screen-scroll">
							<RequestURL message={store} />
							<hr />
							<h4>JSON Response Body:</h4>
							<div style={{ marginTop: '1rem', marginBottom: '.5rem' }}>
								<button type="button" className="resend-modal__send btn btn-sm btn-default btn-secondary"
									title="Copy response body to clipboard"
									onClick={handleCopy}
								>
									<div className="fa fa-copy" />
								</button>
								<button type="button" className="resend-modal__send btn btn-sm btn-primary"
									style={{ marginLeft: '.5rem' }}
									onClick={handleToggleStrJson}>
									{typeof responseBody === 'object' ? 'To String' : 'To JSON'}
								</button>
								<button type="button" className="resend-modal__send btn btn-sm btn-danger"
									style={{ marginLeft: '.5rem' }}
									onClick={handleClear}>
									Clear
								</button>
							</div>
							<div className="resend-modal__body-container">
								{responseBody && typeof responseBody === 'object' ?
									<ReactJson
										theme={themeStore.getTheme() === 'dark' ? 'google' : undefined}
										src={responseBody}
										name={false}
										displayDataTypes={false}
										quotesOnKeys={false}
										onEdit={handleEdit}
										onAdd={handleAdd}
										onDelete={handleDelete}
									/>
									:
									<textarea className="resend-modal__body form-control" rows={100} cols={300}
										onChange={(e) => {
											setResponseBody(e.target.value);
											setModified(true);
										}}
										value={responseBody as string}
										placeholder="Enter response body" />
								}
							</div>
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-default btn-danger"
							disabled={!modified}
							onClick={handleUndo}
						>
							Undo
						</button>
						<button type="button" className="resend-modal__send btn btn-success"
							onClick={handleOk}
						>
							Ok
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);

	function handleCopy() {
		const s = typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody;
		navigator.clipboard.writeText(s);
	}

	function handleOk() {
		message.responseBody = responseBody;
		onClose();
	}

	function handleUndo() {
		setResponseBody(saveResponseBody);
		setModified(false);
	}

	function handleToggleStrJson() {
		if (typeof responseBody === 'object') {
			setResponseBody(JSON.stringify(responseBody, null, 2));
		} else {
			setResponseBody(JSON.parse(responseBody as string));
		}
	}

	function handleClear() {
		setModified(true);
		setResponseBody('');
	}

	function handleEdit(props: InteractionProps) {
		setModified(true);
		setResponseBody(props.updated_src);
		return true;
	}

	function handleAdd(props: InteractionProps) {
		setModified(true);
		setResponseBody(props.updated_src);
		return true;
	}

	function handleDelete(props: InteractionProps) {
		setModified(true);
		setResponseBody(props.updated_src);
		return true;
	}
});

export default BreakpointResponseModal;