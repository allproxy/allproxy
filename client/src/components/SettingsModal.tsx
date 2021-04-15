import React from 'react';
import { Modal } from '@material-ui/core'
import SettingsStore from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SettingsStore,
};
const SettingsModal= observer(({ open, onClose, store }: Props) => {
	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={onClose}
			aria-labelledby="simple-modal-title"
  		aria-describedby="simple-modal-description"
		>
			<div className="settings-modal" role="dialog">
				<div>
					<h3>Settings</h3>
					<div className="settings-modal__scroll-container">
						<table className="table settings-modal__table">
							{store.getEntries().length > 0 ?
							<thead>
								<tr>
									<td></td>
									<td className="text-primary"><label>Protocol</label></td>
									<td className="text-primary"><label>Path or Port</label></td>
									<td className="text-primary"><label>Target Host</label></td>
									<td className="text-primary"><label>Target Port</label></td>
									<td className="align-center text-primary"><label>Capture</label></td>
								</tr>
							</thead>
							: null }
							<tbody>
								{store.getEntries().map((entry, index) => (
									<tr className= "settings-modal__proxy-row" key = { index }
										style={{opacity: entry.recording ? 1 : .5}}
									>
										<td>
											<button className="settings-modal__proxy-delete-button btn btn-xs btn-danger"
												onClick={ () => store.deleteEntry(index) }
											>
												X
											</button>
										</td>
										<td className="settings-modal__proxy-protocol-container">
											<select className="settings-modal__select-protocol form-control"
												onChange={(e) => store.updateEntryProtocol(index, e.target.value)}
												value={ entry.protocol }
											>
												{store.getProtocols().map(protocol =>
													<option key={ protocol }>{protocol}</option>)}
											</select>
										</td>
										<td className="settings-modal__proxy-path-container">
											<input className="settings-modal__proxy-path"
												onChange={ (e) => store.updateEntryPath(index, e.target.value) }
												value={entry.path} />
										</td>
										<td className="settings-modal__proxy-host-container">
											<input className="settings-modal__proxy-host"
												hidden={ entry.protocol === 'proxy:' || entry.protocol === 'log:' }
												onChange={ (e) => store.updateEntryHost(index, e.target.value) }
												value={entry.hostname} />
										</td>
										<td className="settings-modal__proxy-host-container">
											<input className="settings-modal__proxy-host"
												hidden={ entry.protocol === 'proxy:' || entry.protocol === 'log:' }
												onChange={ (e) => store.updateEntryPort(index, e.target.value) }
												value={entry.port} />
										</td>
										<td className="settings-modal__recording-container">
											<div className={'settings__recording fas '
												+ (entry.recording ? 'fa-pause' : 'fa-play')}
												onClick={(e) => store.toggleEntryCapture(index)}
											/>
										</td>
								</tr>
								))}
							</tbody>
						</table>
					</div>
					<div>
						<table>
							<tbody>
								<tr>
									<td className="settings-modal__select-protocol-container">
										<select className="form-control settings-modal__select-protocol"
											onChange={(e) => store.setProtocol(e.target.value)}
											value={ store.getProtocol() }
										>
											{store.getProtocols().map((protocol) => {
												return <option key={ protocol }>{ protocol }</option>
											})};
										</select>
									</td>
									<td className="settings-modal__input-path-container">
										<input type="text" className="form-control settings-modal__input-path"
											placeholder={store.getProtocol() === 'log:'
												? 'Enter log tail command (e.g., docker logs -f container)'
												: 'Enter path (e.g., /xxx/yyy or .*/xxx)'}
											value={ store.getPath() }
											onChange={(e) => store.setPath(e.target.value)}
										/>
									</td>
									<td className="settings-modal__input-url-container">
										<input type="text" className="form-control settings-modal__input-host"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Entry host name'}
											value={ store.getTargetHost() }
											onChange={(e) => store.setTargetHost(e.target.value)}
										/>
									</td>
									<td className="settings-modal__input-url-container">
										<input type="text" className="form-control settings-modal__input-host"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Entry port number'}
											value={ store.getTargetPort() }
											onChange={(e) => store.setTargetPort(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-button-container">
										<button className="settings-modal__add-button btn btn-primary"
											disabled={ store.isAddDisabled() }
											onClick={ () => store.addEntry() }
										>
											Add
										</button>
									</td>
								</tr>
							</tbody>
						</table>
						<hr/>
						<table>
							<tbody>
								<tr>
									<td className="settings-modal__label-max-messages">
										Maximum number of captured messages
									</td>
									<td className="settings-modal__label-max-messages">
										<input type="number" className="form-control settings-modal__input-max-messages"
											onChange={ (e) => store.setMessageQueueLimit(+e.target.value) }
											value={ store.getMessageQueueLimit() } />
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="modal-footer">
						<label className="settings-modal__error-message">{ store.getError() }</label>
						<button type="button" className="settings-modal__cancel btn btn-default btn-default"
							onClick={ onClose }
						>
							Cancel
						</button>
						<button type="button" className="settings-modal__save btn btn-default btn-success"
							disabled={ !store.isChanged() }
							onClick={() => { store.save(); onClose(); } }
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default SettingsModal;