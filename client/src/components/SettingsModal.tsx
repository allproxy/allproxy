import { Modal } from '@material-ui/core'
import SettingsTable from './SettingsTable';
import SettingsStore from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';
import { Tab, Tabs } from '@material-ui/core';
import TabContext from '@material-ui/lab/TabContext';
import TabPanel from '@material-ui/lab/TabPanel';
import React from 'react';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SettingsStore,
};
const SettingsModal = observer(({ open, onClose, store }: Props) => {
	const [tabValue, setTabValue] = React.useState('grpc:');
	store.setProtocol(tabValue);

	function handleTabChange(e: React.ChangeEvent<{}>, value: string) {
		setTabValue(value);
		store.setProtocol(value);
	}

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={onClose}
			disableBackdropClick
			aria-labelledby="simple-modal-title"
  		aria-describedby="simple-modal-description"
		>
			<div className="settings-modal" role="dialog">
				<div>
					<h3>Settings</h3>
					<TabContext value={tabValue}>
						<Tabs
							value={tabValue}
							onChange={handleTabChange}
							indicatorColor="primary"
							textColor="primary"
							aria-label="Settings table">
							{store.getProtocols().map(protocol => (
								<Tab value={protocol} label={protocol} title={store.getTooltip(protocol) }>
								</Tab>
							))}
						</Tabs>
						{store.getProtocols().map(protocol => (
							<TabPanel value={ protocol }>
								<div className="settings-modal__scroll-container">
									<SettingsTable store={store} protocol={ protocol }></SettingsTable>
								</div>
							</TabPanel>
						))}
					</TabContext>
					<div style={{borderTop: 'solid steelblue', paddingTop: '.5rem'}}>
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
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											placeholder={
												store.getProtocol() === 'log:'
												? 'Enter log tail command (e.g., docker logs -f container)'
													: store.getProtocol() === 'http:'
														|| store.getProtocol() === 'https:'
														|| store.getProtocol() === 'proxy:'
												? 'Enter path (e.g., /xxx/yyy or .*/xxx)'
												: 'Entry source TCP port'
											}
											value={ store.getPath() }
											onChange={(e) => store.setPath(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Entry host name'}
											value={ store.getTargetHost() }
											onChange={(e) => store.setTargetHost(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Enter port number'}
											value={ store.getTargetPort() }
											onChange={(e) => store.setTargetPort(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											placeholder={'Enter optional comment'}
											value={ store.getComment() }
											onChange={(e) => store.setComment(e.target.value)}
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