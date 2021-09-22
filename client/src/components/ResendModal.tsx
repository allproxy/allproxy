import { observer } from 'mobx-react-lite';
import { Modal } from '@material-ui/core'
import ResendStore from '../store/ResendStore';

type Props = {
	open: boolean,
	onClose: () => void,
	store: ResendStore,
};
const ResendModal = observer(({ open, onClose, store }: Props) => {
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
						<div>
							<label>URL:</label>
						</div>
						<div className="resend-modal__url-container">
							<textarea className="resend-modal__url form-control" rows={2} cols={300}
								onChange={ (e) => store.setMethodAndUrl(e.target.value) }
								value={ store.getMethodAndUrl() }
								placeholder="Enter <method> <url>"/>
						</div>
						<div style={{marginTop: '10px'}}>
							<label>Body:&nbsp;</label>
							{/* <button className='resend-modal__indent-button btn btn-xs btn-primary'>
								Indent
							</button> */}
						</div>
						<div className="resend-modal__body-container">
							<textarea className="resend-modal__body form-control" rows={10} cols={300}
								onChange={ (e) => store.validateBody(e.target.value) }
								value={ store.getBody() }
								placeholder="Enter request body"/>
	        	</div>
	        </div>
	        <div className="modal-footer">
						<label className="resend-modal__error-message">{ store.getError() }</label>
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
	)
})

export default ResendModal;