import React from 'react';
import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import {breakpointStore} from '../store/BreakpointStore';
import {noCaptureStore} from '../store/NoCaptureStore';
import { observer } from 'mobx-react-lite';
import ReachableHostsModal from './ReachableHostsModal';
import SettingsModal from './SettingsModal';
import NoCaptureModal from './NoCaptureModal';
import BreakpointModal from './BreakpointModal';
import { HostStatus, settingsStore } from '../store/SettingsStore';
import MessageQueueStore from '../store/MessageQueueStore';
import MetricsModal from './MetricsModal';
import { metricsStore } from '../store/MetricsStore';
import { useFilePicker } from "use-file-picker";
import { Menu, MenuItem } from '@material-ui/core';
import ExportDialog from './ExportDialog';
import SnapshotStore from '../store/SnapshotStore';

let filterWasStopped = false;

/**
 * Header view
 */
type Props = {
	socketStore: SocketStore,
	messageQueueStore: MessageQueueStore,
	snapshotStore: SnapshotStore,
	filterStore: FilterStore
};
const Header = observer(({ socketStore, messageQueueStore, snapshotStore, filterStore }: Props) : JSX.Element => {
	const [showSettingsModal, setShowSettingsModal] = React.useState(false);
	const [showNoCaptureModal, setShowNoCaptureModal] = React.useState(false);
	const [showBreakpointModal, setShowBreakpointModal] = React.useState(false);
	const [showReachableHostsModal, setShowReachableHostsModal] = React.useState(false);
	const [showMetricsModal, setShowMetricsModal] = React.useState(false);
	const [moreMenuIcon, setMoreMenuIcon] = React.useState<HTMLDivElement|null>(null);
	const [settingsMenuIcon, setSettingsMenuIcon] = React.useState<HTMLDivElement|null>(null);
	const [openExportDialog, setOpenExportDialog] = React.useState(false);
	const [openFileSelector, {filesContent, clear}] = useFilePicker({
		multiple: false,
		accept: ".allproxy"
	  });

	if (!!filesContent.length && filesContent[0].content) {
		snapshotStore.importSnapshot(filesContent[0].name, filesContent[0].content);
		clear();
	}

	function getDisplayedCount(): number {
		let n = 0;
		messageQueueStore.getMessages().map((messageStore) => {
			if (!filterStore.isFiltered(messageStore)) ++n;
		})
		return n;
	}

	const statusClassName = 'fa ' + (socketStore.isConnected()
		? 'success fa-circle' : 'error fa-exclamation-triangle');
	return (
		<div className="header__container">
			<div className="header__left-container">
				<div className="header__icon" onClick={ () => window.location.reload() }>
					<img src="favicon.ico" alt="AllProxy Debugging Tool"
						width="24" height="24" />
				</div>
				<div className="header__title" onClick={() => window.location.reload()}>
					AllProxy
				</div>
				<div className={"header__status " + statusClassName} title="Status"></div>

				<div style={{
					opacity: snapshotStore.isActiveSnapshotSelected() ? undefined : 0.3,
					pointerEvents: snapshotStore.isActiveSnapshotSelected() ? undefined : 'none'
					}}>
					<div className="header__trash fa fa-trash-alt" title="Clear log"
						onClick={() => {
							messageQueueStore.clear();
							// filterStore.setFilter('');
							socketStore.clearMetrics();
						}}
					/>
					<div className={'header__stop fas '
						+ (messageQueueStore.getStopped() ? 'fa-play' : 'fa-pause')}
						onClick={() => messageQueueStore.toggleStopped()}
						title={ (messageQueueStore.getStopped() ? 'Resume recording' : 'Pause recording') }
					/>
					<div className={'header__auto-scroll fa-arrow-alt-circle-down '
						+ (messageQueueStore.getAutoScroll() ? 'fas' : 'far')}
						onClick={() => messageQueueStore.toggleAutoScroll()}
						title={ (messageQueueStore.getAutoScroll() ? 'Stop auto scroll' : 'Start auto scroll') }
					/>
				</div>

				<div className={'header__sort-req-res fa-solid fa-arrow-down fas'}
					onClick={() => messageQueueStore.toggleSortBy()}
					title={ (messageQueueStore.getSortByReq() ? 'Change to sort by response' : 'Change to sort by request') }
				>
					{messageQueueStore.getSortByReq() ? 'Req' : 'Res'}
				</div>

				<div className={'header__show-errors fa-bug fa '
						+ (filterStore.getShowErrors() ? 'active' : '')}
						onClick={() => filterStore.toggleShowErrors()}
						title={ 'Toggle show only errors' }
					/>

				<div className={'header__more-menu fa fa-ellipsis-v'}
					onClick={(e) => setMoreMenuIcon(e.currentTarget)}
				/>
				<Menu
					anchorEl={moreMenuIcon}
					open={Boolean(moreMenuIcon)}
					onClose={() => setMoreMenuIcon(null)}
					>
					<MenuItem
						style={{
							opacity: snapshotStore.getSnapshotCount() > 1 ? undefined : 0.3,
							pointerEvents: snapshotStore.getSnapshotCount() > 1 ? undefined : 'none'
						}}>
						<div className="header__folder-minus fa fa-folder-minus" title="Delete all snapshots"
							onClick={() => {
								snapshotStore.deleteAllSnapshots();
								setMoreMenuIcon(null);
							}}
						>
							&nbsp;Delete Snapshots
						</div>
					</MenuItem>
					<MenuItem style={{
							opacity: !snapshotStore.isActiveSnapshotSelected() || messageQueueStore.getStopped()
								? undefined : 0.3,
							pointerEvents: !snapshotStore.isActiveSnapshotSelected() || messageQueueStore.getStopped()
								? undefined : 'none'
							}}>
						<div className="header__export fa fa-download" title="Export snapshot file"
							onClick={() => {
								setOpenExportDialog(true);
								setMoreMenuIcon(null);
							}}
						>
							&nbsp;Export Snapshot
						</div>
					</MenuItem>
					<MenuItem>
						<div className="header__import fa fa-upload" title="Import snapshot file"
							onClick={() => {
								openFileSelector();
								setMoreMenuIcon(null);
							}}
						>
							&nbsp;Import Snapshot
						</div>
					</MenuItem>
				</Menu>

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
				<div className={`header__filter-case ${filterStore.matchCase() ? 'active' : ''}`}
					title="Match case" onClick={() => filterStore.toggleMatchCase()}>Aa</div>
				<div className={`header__filter-regex ${filterStore.regex() ? 'active' : ''}`}
					title="Use regular expression" onClick={() => filterStore.toggleRegex()}>.*</div>
				<div className={`header__filter-logical ${filterStore.logical() ? 'active' : ''}`}
					title="Use (), &&, ||, !" onClick={() => filterStore.toggleLogical()}>&&</div>
				<div className={`header__filter-logical ${filterStore.deleteFiltered() ? 'active' : ''}`}
					title="Delete filtered messages" onClick={() => filterStore.toggleDeleteFiltered()}>X</div>
			</div>
			<div>
				<div className="header__count" title="Received messages">
					<div>{getDisplayedCount()+' of '+messageQueueStore.getTotalLength()}</div>
				</div>
			</div>
			<div>
				<div className="header__count" title="Received messages">
					{socketStore.getRequestCount() > socketStore.getResponseCount() ??
						<div>No Response: {socketStore.getRequestCount() - socketStore.getResponseCount()}</div>
					}
				</div>
				<div className="header__count" title="Messages queued at server">
					<div>Queued: {socketStore.getQueuedCount() }</div>
				</div>
			</div>
			<div>
				<div className="header__settings fa fa-chart-bar" title="Metrics"
					onClick={() => { setShowMetricsModal(true); } }>
				</div>
				<div className="header__settings fa fa-network-wired" title="Reachable Hosts"
					onClick={() => { setShowReachableHostsModal(true); settingsStore.setConfig(); } }>
				</div>
				<div className={'header__settings fa fa-cog'} title="Settings"
					onClick={(e) => setSettingsMenuIcon(e.currentTarget)}
				/>
				<Menu
					anchorEl={settingsMenuIcon}
					open={Boolean(settingsMenuIcon)}
					onClose={() => setSettingsMenuIcon(null)}
					>
					<MenuItem>
						<div className="fa fa-network-wired"
							onClick={() => {
								setShowSettingsModal(true);
								settingsStore.reset();
								setSettingsMenuIcon(null);
								if(!messageQueueStore.getStopped()) {
									messageQueueStore.setStopped(true);
									filterWasStopped = true;
								}
							}}
						>
							&nbsp;Proxy Configuration
						</div>
					</MenuItem>
					<MenuItem>
						<div className="fa fa-bug" title="Breakpoints"
							onClick={() => { setShowBreakpointModal(true); breakpointStore.init(); setSettingsMenuIcon(null); } }>
								&nbsp;Breakpoints
						</div>
					</MenuItem>
					<MenuItem>
						<div className="fa fa-ban" title="No Capture List"
							onClick={() => { setShowNoCaptureModal(true); noCaptureStore.init(); setSettingsMenuIcon(null); } }>
								&nbsp;No Capture List
						</div>
					</MenuItem>
				</Menu>
			</div>

			{/*
				Modals
			*/}
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
				onClose={() => {
					setShowSettingsModal(false);
					if(filterWasStopped) {
						filterWasStopped = false;
						messageQueueStore.setStopped(false);
					}
				}}
				store={ settingsStore }
			/>
			<BreakpointModal
				open={showBreakpointModal}
				onClose={() => setShowBreakpointModal(false)}
				store={ breakpointStore }
			/>
			<NoCaptureModal
				open={showNoCaptureModal}
				onClose={() => setShowNoCaptureModal(false)}
				store={ noCaptureStore }
			/>
			<ExportDialog
				open={openExportDialog}
				onClose={(fileName) => {
					setOpenExportDialog(false);
					if (fileName.length > 0) {
						snapshotStore.exportSelectedSnapshot(fileName);
					}
				}}
			/>
		</div>
	)
});

export default Header;