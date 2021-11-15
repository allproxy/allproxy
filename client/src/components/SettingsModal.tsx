import { Modal } from '@material-ui/core'
import SettingsTable from './SettingsTable';
import SettingsStore, { ConfigCategory, ConfigCategoryGroups } from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';
import { Tab, Tabs } from '@material-ui/core';
import TabContext from '@material-ui/lab/TabContext';
import TabPanel from '@material-ui/lab/TabPanel';
import React from 'react';
import { ConfigProtocol } from '../common/ProxyConfig';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SettingsStore,
};
const SettingsModal = observer(({ open, onClose, store }: Props) => {
	const [tabCategory, setTabCategory] = React.useState<ConfigCategory>('BROWSER');
	const [tabProtocol, setTabProtocol] = React.useState<ConfigProtocol>(ConfigCategoryGroups.get(tabCategory)![0].protocol);

	store.setConfigCategory(tabCategory as ConfigCategory);
	store.setProtocol(tabProtocol);

	function handleTabCategoryChange(_e: React.ChangeEvent<{}>, value: string) {
		setTabCategory(value as ConfigCategory);
		store.setConfigCategory(value as ConfigCategory);

		store.setProtocol(ConfigCategoryGroups.get(store.getConfigCategory())![0].protocol);
		setTabProtocol(store.getProtocol() as ConfigProtocol);
	}

	function handleTabProtocolChange(_e: React.ChangeEvent<{}>, value: string) {
		setTabProtocol(value as ConfigProtocol);
		store.setProtocol(value as ConfigProtocol);
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
					<h3>Setting: <span style={{color: 'steelblue'}}>{store.getSubTitle()}</span></h3>
					<TabContext value={tabCategory}>
						<Tabs
							value={tabCategory}
							onChange={handleTabCategoryChange}
							indicatorColor="primary"
							textColor="primary"
							variant="scrollable"
  						scrollButtons="auto"
							aria-label="Settings table">
							{store.getConfigCategories().map(category => (
								<Tab
									key={ category }
									value={category}
									label={
										<div>
											<span style={{ marginLeft: '.25rem' }}>{category}</span>
										</div>
									}
									>
								</Tab>
							))}
						</Tabs>
						{store.getConfigCategories().map(category => (
							<TabPanel value={ category } key={ category }>
								{ConfigCategoryGroups.get(store.getConfigCategory())!.length === 1
									?
										<div className="settings-modal__scroll-container">
											<SettingsTable
												store={store}
												protocol={ store.getProtocol() as ConfigProtocol }
											/>
										</div>
									:
										<TabContext value={tabProtocol}>
											<Tabs
												style={{background: 'whitesmoke'}}
												value={tabProtocol}
												onChange={handleTabProtocolChange}
												indicatorColor="secondary"
												textColor="secondary"
												variant="fullWidth"
												aria-label="Settings table">
												{ConfigCategoryGroups.get(store.getConfigCategory())!.map(protocolDesc => (
													<Tab
														value={protocolDesc.protocol}
														label={
															<div>
																<span style={{ marginLeft: '.25rem' }}>{protocolDesc.protocol}</span>
															</div>
														}
														>
													</Tab>
												))}
											</Tabs>
											{ConfigCategoryGroups.get(store.getConfigCategory())!.map(protocolDesc => (
												<TabPanel value={ protocolDesc.protocol } key={ protocolDesc.protocol }>
													<div className="settings-modal__scroll-container">
														<SettingsTable
															store={store}
															protocol={ protocolDesc.protocol }
														/>
													</div>
												</TabPanel>
											))}
									</TabContext>
								}
							</TabPanel>
						))}
					</TabContext>
					<div style={{borderTop: 'solid steelblue', paddingTop: '.5rem'}}>
						<table>
							<tbody>
								<tr>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											placeholder={
												store.getProtocol() === 'log:'
												? 'Log tail command (e.g., docker logs -f container)'
													: store.getProtocol() === 'http:'
													|| store.getProtocol() === 'https:'
												? 'Path: /xxx, .*/xxx, or hostname/xxx'
												: store.getProtocol() === 'browser:'
													? 'Path: /xxx, or .*/xxx'
													: 'Source TCP port'
											}
											value={ store.getPath() }
											onChange={(e) => store.setPath(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Target host name'}
											value={ store.getTargetHost() }
											onChange={(e) => store.setTargetHost(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											hidden={ store.isProxyOrLog() }
											placeholder={store.isProxyOrLog() ? '' : 'Target port number'}
											value={ store.getTargetPort() }
											onChange={(e) => store.setTargetPort(e.target.value)}
										/>
									</td>
									<td className="settings-modal__add-container">
										<input type="text" className="form-control settings-modal__add-input"
											placeholder={'Optional comment'}
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