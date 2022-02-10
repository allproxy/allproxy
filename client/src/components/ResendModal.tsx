import { observer } from 'mobx-react-lite';
import { Modal } from '@material-ui/core'
import ResendStore from '../store/ResendStore';
import ReactJson, { InteractionProps } from 'react-json-view';

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
				<select className="resend-modal__method"
					onChange={e => store.setMethod(e.target.value)} value={store.getMethod()}
				>
					<option>GET</option>
					<option>DELETE</option>
					<option>PATCH</option>
					<option>POST</option>
					<option>PUT</option>					
				</select>			
				<div className="resend-modal__url-container">
					<textarea className="resend-modal__url form-control" rows={2} cols={300}
						onChange={ (e) => store.setUrl(e.target.value) }
						value={ store.getUrl() }
						placeholder="<method> <url>"/>
				</div>
				<div style={{marginTop: '10px'}}>
					<button type="button" className="resend-modal__send btn btn-sm btn-danger" 
						onClick={ handleRemoveBody }>
						Remove Body
					</button>
				</div>
				<div className="resend-modal__body-container">
					{message.requestBody && typeof message.requestBody === 'object' ?
						<ReactJson
							src={message.requestBody}
							name={false}
							displayDataTypes={false}
							quotesOnKeys={false}
							onEdit={handleEdit}
							onAdd={handleAdd}
							onDelete={handleDelete}
						/>
					:
						<textarea className="resend-modal__body form-control" rows={10} cols={300}
							onChange={ (e) => store.setBody(e.target.value) }
							value={ store.getBody() as string }
							placeholder="Enter request body"/>
				}
	        	</div>
	        </div>
	        <div className="modal-footer">
						<label className="resend-modal__error-message">{ store.getError() }</label>
						<button type="button" className="settings-modal__cancel btn btn-default btn-default"
							onClick={ onClose }
						>
							Cancel
						</button>
						<button type="button" className="resend-modal__send btn btn-default btn-success"
							onClick={() => { store.doResend(); onClose() }}
							disabled={ store.getError().length > 0 }
						>
							Send
						</button>
	        </div>
	      </div>
	    </div>
	  </Modal>
	);

	function handleRemoveBody() {
		message.requestBody = "";
		store.setBody("");
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
})

export default ResendModal;