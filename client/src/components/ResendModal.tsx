import { observer } from 'mobx-react-lite';
import { List, ListItem, Modal } from '@material-ui/core';
import ResendStore from '../store/ResendStore';
import ReactJson, { InteractionProps } from 'react-json-view';
import { themeStore } from '../store/ThemeStore';
import { mainTabStore, PROXY_TAB_NAME } from '../store/MainTabStore';
import GTag from '../GTag';

type Props = {
	open: boolean,
	onClose: () => void,
	store: ResendStore,
};
const ResendModal = observer(({ open, onClose, store }: Props) => {
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
					<h3 className="modal-title">Edit Request and Send</h3>
					<div className="modal-body">
						<div className="modal-full-screen-scroll">
							<select className="resend-modal__field"
								onChange={e => store.setMethod(e.target.value)} value={store.getMethod()}
							>
								<option selected={store.getMethod() === 'GET'}>GET</option>
								<option selected={store.getMethod() === 'DELETE'}>DELETE</option>
								<option selected={store.getMethod() === 'PATCH'}>PATCH</option>
								<option selected={store.getMethod() === 'POST'}>POST</option>
								<option selected={store.getMethod() === 'PUT'}>PUT</option>
							</select>
							<div>
								<select className="resend-modal__field"
									onChange={e => store.setProtocol(e.target.value)} value={store.getProtocol()}				>
									<option selected={store.getProtocol() === 'https'}>https</option>
									<option selected={store.getProtocol() === 'http'}>http</option>
								</select>
								<input className="resend-modal__field resend-modal__host"
									type="text"
									placeholder="Host"
									onChange={e => store.setHost(e.target.value)} value={store.getHost()}
								/>
								<input className="resend-modal__field"
									type="number"
									placeholder="Port"
									onChange={e => store.setPort(e.target.value)} value={store.getPort()}
								/>
							</div>
							<div className="resend-modal__url-container">
								<textarea className="resend-modal__url form-control"
									rows={2} cols={300}
									placeholder="Path and query parameters"
									onChange={(e) => store.setPath(e.target.value)}
									value={store.getPath()}
								/>
							</div>
							<details>
								<summary>Headers:</summary>
								<List>
									{store.getHeaders().map((header, i) => (
										<ListItem key={i}
											style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
											<div style={{ width: maxHeaderKeySize() + 2 + 'ch' }}>
												{header.key}
											</div>
											<input className="resend-modal__header-input"
												placeholder="Header value"
												value={header.value}
												onChange={(e) => store.setHeaderValue(i, e.target.value)}
											/>
										</ListItem>
									))}
								</List>
							</details>
							<p></p>
							<details open>
								<summary>Body:</summary>
								<div style={{ marginTop: '1rem', marginBottom: '.5rem' }}>
									<button type="button" className="resend-modal__send btn btn-sm btn-default"
										title="Copy request body to clipboard"
										onClick={handleCopy}
									>
										<div className="fa fa-copy" />
									</button>
									<button type="button" className="resend-modal__send btn btn-sm btn-primary"
										style={{ marginLeft: '.5rem' }}
										onClick={handleToggleStrJson}>
										{typeof message.requestBody === 'object' ? 'To String' : 'To JSON'}
									</button>
									<button type="button" className="resend-modal__send btn btn-sm btn-danger"
										style={{ marginLeft: '.5rem' }}
										onClick={handleClear}>
										Clear
									</button>
								</div>
								<div className="resend-modal__body-container">
									{message.requestBody && typeof message.requestBody === 'object' ?
										<ReactJson
											theme={themeStore.getTheme() === 'dark' ? 'google' : undefined}
											src={message.requestBody}
											name={false}
											displayDataTypes={false}
											quotesOnKeys={false}
											onEdit={handleEdit}
											onAdd={handleAdd}
											onDelete={handleDelete}
										/>
										:
										<textarea className="resend-modal__body form-control" rows={100} cols={300}
											onChange={(e) => store.setBody(e.target.value)}
											value={store.getBody() as string}
											placeholder="Enter request body" />
									}
								</div>
							</details>
						</div>
					</div>
					<div className="modal-footer">
						<label className="resend-modal__error-message">{store.getError()}</label>
						<button type="button" className="settings-modal__cancel btn  btn-secondary"
							onClick={handleClose}
						>
							Cancel
						</button>
						<button type="button" className="resend-modal__send btn btn-success"
							onClick={handleSend}
							disabled={store.getError().length > 0}
						>
							Send
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);

	function maxHeaderKeySize(): number {
		let size = 0;
		store.getHeaders().forEach((header) => {
			size = Math.max(size, header.key.length);
		});
		return size;
	}

	function handleCopy() {
		const s = typeof message.requestBody === 'object' ? JSON.stringify(message.requestBody, null, 2) : message.requestBody;
		navigator.clipboard.writeText(s);
	}

	function handleClose() {
		onClose();
	}

	function handleSend() {
		store.doResend();
		onClose();
		mainTabStore.setSelectedTabName(PROXY_TAB_NAME);
		GTag.pageView('ResendModal');
	}

	function handleToggleStrJson() {
		if (typeof message.requestBody === 'object') {
			message.requestBody = JSON.stringify(message.requestBody, null, 2);
		} else {
			message.requestBody = JSON.parse(message.requestBody);
		}
		store.setBody(message.requestBody);
	}

	function handleClear() {
		message.requestBody = '';
		store.setBody('');
	}

	function handleEdit(props: InteractionProps) {
		store.setBody(props.updated_src);
		return true;
	}

	function handleAdd(props: InteractionProps) {
		store.setBody(props.updated_src);
		return true;
	}

	function handleDelete(props: InteractionProps) {
		store.setBody(props.updated_src);
		return true;
	}
});

export default ResendModal;