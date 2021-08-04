import { CircularProgress, Modal } from '@material-ui/core'
import SettingsStore from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import pickIcon from '../PickIcon';

type Props = {
	open: boolean,
	onClose: () => void,
	store: SettingsStore,
};
const ReachableHostsModal = observer(({ open, onClose, store }: Props) => {

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
								: store.getEntries(true).length === 0
									? <div>No hosts are reachable!</div>
									:	<table className="table settings-modal__table">
											{store.getEntries(true).length > 0 ?
												<thead>
													<tr>
														<td className="text-primary"><label>Host</label></td>
														<td className="text-primary"><label>Port</label></td>
													</tr>
												</thead>
												: null}
											<tbody>
												{store.getEntries(true)
													.map((entry, index) => (
														<tr className="settings-modal__proxy-row" key={index}>
															<td className="settings-modal__proxy-host-container">
																<input className="form-control settings-modal__proxy-host" value={entry.hostname} disabled />
															</td>
															<td className="settings-modal__proxy-host-container">
																<input className="form-control settings-modal__proxy-host" value={entry.port} disabled />
															</td>
														</tr>
													))}
											</tbody>
										</table>
								}
							</div>
					</div>
					<div className="modal-footer">
						<label className="settings-modal__error-message">{store.getError()}</label>
						<button type="button" className="settings-modal__cancel btn btn-default btn-success"
							onClick={ onRefresh }
						>
							Refresh
						</button>
						<button type="button" className="settings-modal__cancel btn btn-default btn-default"
							onClick={ onClose }
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