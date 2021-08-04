import React from 'react';
import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import { observer } from 'mobx-react-lite';
import ReachableHostsModal from './ReachableHostsModal';
import SettingsModal from './SettingsModal';
import { HostStatus, settingsStore } from '../store/SettingsStore';
import MessageQueueStore from '../store/MessageQueueStore';

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
				<div className="header__trash fa fa-trash-alt" title="Clear log"
					onClick={() => {
						messageQueueStore.clear();
						filterStore.setFilter('');
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
				<div className="header__settings fa fa-network-wired" title="Reachable Hosts"
					onClick={() => { setShowReachableHostsModal(true); settingsStore.setConfig(); } }>
				</div>
				<div className="header__settings fa fa-cog" title="Settings"
					onClick={() => { setShowSettingsModal(true); settingsStore.reset(); } }>
				</div>
			</div>
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