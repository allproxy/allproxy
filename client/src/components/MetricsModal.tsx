import { Modal } from '@material-ui/core';
import MetricsStore from '../store/MetricsStore';
import { observer } from 'mobx-react-lite';
import pickIcon from '../PickIcon';
import { ConfigProtocols } from '../store/SettingsStore';

type Props = {
	open: boolean,
	onClose: () => void,
	store: MetricsStore,
};
const MetricsModal = observer(({ open, onClose, store }: Props) => {

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={onClose}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="metrics-modal" role="dialog">
				<div>
					<h3>Metrics</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="metrics-modal__scroll-container">
							<table className="table settings-modal__table">
								<thead>
									<tr>
										<td className="text-primary"><label>Protocol</label></td>
										<td className="text-primary"><label>Request Count</label></td>
										<td className="text-primary"><label>Response Count</label></td>
										<td className="text-primary"><label>Total Time</label></td>
										<td className="text-primary"><label>Average Time</label></td>
										<td className="text-primary"><label>Maximum Time</label></td>
									</tr>
								</thead>
								<tbody>
									{store.getMetrics()
										.map((entry, i) => (
											<tr className="settings-modal__proxy-row" key={i}>
												<td className="settings-modal__proxy-host-container">
													<div className={pickIcon(ConfigProtocols[i])}>
														<span style={{ marginLeft: '.25rem' }}>{ConfigProtocols[i]}</span>
													</div>
												</td>
												<td className="settings-modal__proxy-host-container">
													{entry.requestCount}
												</td>
												<td className="settings-modal__proxy-host-container">
													{entry.responseCount}
												</td>
												<td className="settings-modal__proxy-host-container">
													{entry.totalTime}
												</td>
												<td className="settings-modal__proxy-host-container">
													{entry.requestCount > 0 ? (entry.totalTime / entry.requestCount).toFixed(1) : 0}
												</td>
												<td className="settings-modal__proxy-host-container">
													{entry.maximumTime}
												</td>
											</tr>
										))}
								</tbody>
							</table>
						</div>
					</div>
					<div className="modal-footer">
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

export default MetricsModal;