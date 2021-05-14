import React from 'react';
import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import { observer } from 'mobx-react-lite';
import SettingsModal from './SettingsModal';
import { settingsStore } from '../store/SettingsStore';
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
	const [modalShow, setModalShow] = React.useState(false);
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
				<div className="header__filter">
					<input className="header__filter-input" type="text"
						value={ filterStore.getFilter() }
						onChange={e => filterStore.setFilter(e.currentTarget.value)}
						placeholder="Boolean/Regex Filter: (a || b.*) && !c" />
				</div>
			</div>
			<div className="header__settings fa fa-cog" title="Settings"
				onClick={() => { setModalShow(true); settingsStore.reset(); } }>
			</div>
			<SettingsModal
				open={modalShow}
				onClose={() => setModalShow(false)}
				store={ settingsStore }
			/>
		</div>
	)
});

export default Header;