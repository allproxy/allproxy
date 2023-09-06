import { CircularProgress, Modal, Tab, Tabs } from '@material-ui/core';
import SettingsStore, { HostStatus } from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { TabContext, TabPanel } from '@material-ui/lab';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SettingsStore,
	initTabValue: HostStatus,
};
const ReachableHostsModal = observer(({ open, onClose, store, initTabValue }: Props) => {
	const TAB_VALUES = [HostStatus.Reachable, HostStatus.Unreachable];
	const [tabValue, setTabValue] = React.useState(initTabValue);

	function handleTabChange(_e: React.ChangeEvent<{}>, value: HostStatus) {
		setTabValue(value);
	}

	function onRefresh() {
		store.setConfig();
	}

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={onClose}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="reachable-modal" role="dialog">
				<div>
					<h3>Reachable Hosts</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="reachable-modal__scroll-container">
							{store.isStatusUpdating()
								? <div style={{
									width: '100%',
									marginTop: '1rem',
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
								}}>
									<CircularProgress />
								</div>
								:
								<TabContext value={tabValue}>
									<Tabs
										value={tabValue}
										onChange={handleTabChange}
										indicatorColor="primary"
										textColor="primary"
										aria-label="Settings table">
										{TAB_VALUES.map(value => (
											<Tab value={value}
												label={
													<div className={'fa ' +
														(value === HostStatus.Reachable
															? 'success fa-circle'
															: 'error fa-exclamation-triangle')}>
														<span style={{ marginLeft: '.25rem', color: 'black' }}>{value}</span>
													</div>
												}>
											</Tab>
										))}
									</Tabs>
									{TAB_VALUES.map(value => (
										<TabPanel value={value}>
											{store.getEntries(value).length === 0
												? <div>No hosts are {value.toLocaleLowerCase()} !</div>
												: <table className="table table-compact settings-modal__table" style={{ pointerEvents: 'none' }}>
													{store.getEntries(value).length > 0 ?
														<thead>
															<tr>
																<td className="text-primary"><label>Host</label></td>
																<td className="text-primary"><label>Port</label></td>
															</tr>
														</thead>
														: null}
													<tbody>
														{store.getEntries(value).sort((a, b) => a.hostname.localeCompare(b.hostname))
															.map((entry, index) => (
																<tr className="settings-modal__proxy-row" key={index}>
																	<td className="settings-modal__proxy-host-container">
																		<input className="form-control settings-modal__proxy-host"
																			style={{ border: 'none' }}
																			value={entry.hostname} />
																	</td>
																	<td className="settings-modal__proxy-host-container">
																		<input className="form-control settings-modal__proxy-host"
																			style={{ border: 'none' }}
																			value={entry.port} />
																	</td>
																</tr>
															))}
													</tbody>
												</table>
											}
										</TabPanel>
									))}
								</TabContext>
							}
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-success"
							onClick={onRefresh}
						>
							Refresh
						</button>
						<button type="button" className="settings-modal__cancel btn btn-secondary"
							onClick={onClose}
						>
							Close
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default ReachableHostsModal;