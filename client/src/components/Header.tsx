import React from 'react';
import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import { observer } from 'mobx-react-lite';
import ReachableHostsModal from './ReachableHostsModal';
import SettingsModal from './SettingsModal';
import { HostStatus, settingsStore } from '../store/SettingsStore';
import MessageQueueStore from '../store/MessageQueueStore';
import MetricsModal from './MetricsModal';
import { metricsStore } from '../store/MetricsStore';
import { useFilePicker } from "use-file-picker";

/**
 * Header view
 */
type Props = {
	socketStore: SocketStore,
	messageQueueStore: MessageQueueStore,
	filterStore: FilterStore
};
const Header = observer(({ socketStore, messageQueueStore, filterStore }: Props) : JSX.Element => {
	const [showSettingsModal, setShowSettingsModal] = React.useState(false);
	const [showReachableHostsModal, setShowReachableHostsModal] = React.useState(false);
	const [showMetricsModal, setShowMetricsModal] = React.useState(false);
	const [openFileSelector, {filesContent, errors}] = useFilePicker({
		multiple: false,
		accept: ".middleman"
	  });

	const statusClassName = 'fa ' + (socketStore.isConnected()
		? 'success fa-circle' : 'error fa-exclamation-triangle');
	return (
		<div className="header__container">
			<div className="header__left-container">
				<div className="header__icon" onClick={ () => window.location.reload() }>
					<img src="favicon.ico" alt="Middleman Proxy Tool"
						width="24" height="24" />
				</div>
				<div className="header__title" onClick={() => window.location.reload()}>
					Middleman
				</div>
				<div className={"header__status " + statusClassName} title="Status"></div>

				<div hidden style={{
					opacity: !messageQueueStore.isActiveSnapshotSelected() ? undefined : 0.3,
					pointerEvents: !messageQueueStore.isActiveSnapshotSelected() ? undefined : 'none'
					}}>
					<div className="header__export fa fa-download" title="Export snapshot file"
						onClick={() => {
							messageQueueStore.exportSelectedSnapshot()
						}}
					/>
				</div>
				<div style={{
					opacity: messageQueueStore.isActiveSnapshotSelected() ? undefined : 0.3,
					pointerEvents: messageQueueStore.isActiveSnapshotSelected() ? undefined : 'none'
					}}>
					<div hidden className="header__import fa fa-upload" title="Import snapshot file"
						onClick={() => {
							openFileSelector();
							if(errors.length === 0) {
								messageQueueStore.importSnapshot(filesContent[0].content);
							}
						}}
					/>
					<div className="header__folder-minus fa fa-folder-minus" title="Delete all snapshots"
						style={{
							opacity: messageQueueStore.getSnapshotCount() > 1 ? undefined : 0.3,
							pointerEvents: messageQueueStore.getSnapshotCount() > 1 ? undefined : 'none'
						}}
						onClick={() => {
							messageQueueStore.deleteAllSnapshots()
						}}
					/>
					<div className="header__trash fa fa-trash-alt" title="Clear log"
						onClick={() => {
							messageQueueStore.clear();
							filterStore.setFilter('');
							socketStore.clearMetrics();
						}}
					/>
					<div className={'header__stop fas '
						+ (messageQueueStore.getStopped() ? 'fa-play' : 'fa-pause')}
						onClick={(e) => messageQueueStore.toggleStopped()}
						title={ (messageQueueStore.getStopped() ? 'Resume recording' : 'Pause recording') }
					/>
					<div className={'header__auto-scroll fa-arrow-alt-circle-down '
						+ (messageQueueStore.getAutoScroll() ? 'fas' : 'far')}
						onClick={(e) => messageQueueStore.toggleAutoScroll()}
						title={ (messageQueueStore.getAutoScroll() ? 'Stop auto scroll' : 'Start auto scroll') }
					/>
				</div>

				<div className="header__filter">
					<input className="header__filter-input" type="text"
						style={{
							background: !filterStore.isInvalidFilterSyntax()
								? (filterStore.getFilter().length > 0 ? 'lightGreen' : undefined)
								: 'lightCoral'
						}}
						value={ filterStore.getFilter() }
						onChange={e => filterStore.setFilter(e.currentTarget.value)}
						placeholder="Boolean/Regex Filter: (a || b.*) && !c" />
				</div>
			</div>
			<div>
				<div className="header__count" title="Received messages">
					<div>Requests/Responses: {socketStore.getRequestCount()+'/'+socketStore.getResponseCount()}</div>
				</div>
				<div className="header__count" title="Messages queued at server">
					<div>Queued: {socketStore.getQueuedCount() }</div>
				</div>
			</div>
			<div>
				<div className="header__settings fa fa-table" title="Metrics"
					onClick={() => { setShowMetricsModal(true); } }>
				</div>
				<div className="header__settings fa fa-network-wired" title="Reachable Hosts"
					onClick={() => { setShowReachableHostsModal(true); settingsStore.setConfig(); } }>
				</div>
				<div className="header__settings fa fa-cog" title="Settings"
					onClick={() => { setShowSettingsModal(true); settingsStore.reset(); } }>
				</div>
			</div>
			<MetricsModal
				open={showMetricsModal}
				onClose={() => setShowMetricsModal(false)}
				store={metricsStore}
			/>
			<ReachableHostsModal
				open={showReachableHostsModal}
				onClose={() => setShowReachableHostsModal(false)}
				store={settingsStore}
				initTabValue={ HostStatus.Reachable }
			/>
			<SettingsModal
				open={showSettingsModal}
				onClose={() => setShowSettingsModal(false)}
				store={ settingsStore }
			/>
		</div>
	)
});

export default Header;