import React from 'react';
import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import { breakpointStore } from '../store/BreakpointStore';
import { noCaptureStore } from '../store/NoCaptureStore';
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
import { ListItemText, Menu, MenuItem, Select } from '@material-ui/core';
import ExportDialog from './ExportDialog';
import MainTabStore from '../store/MainTabStore';
import HelpDialog from './HelpDialog';
import DarkModeDialog from './DarkModeDialog';
import ImportJSONFileDialog from './ImportJSONFileDialog';
import JSONFieldsModal, { getJSONFields } from './JSONFieldsModal';
import { jsonLogStore, updateJSONRequestLabels } from '../store/JSONLogStore';
import FilterBar from './FilterBar';
import NotesModal from './NotesModal';
import { urlPathStore } from '../store/UrlPathStore';

let filterWasStopped = false;

/**
 * Header view
 */
type Props = {
	socketStore: SocketStore,
	messageQueueStore: MessageQueueStore,
	mainTabStore: MainTabStore,
	filterStore: FilterStore
};
const Header = observer(({ socketStore, messageQueueStore, mainTabStore, filterStore }: Props): JSX.Element => {
	const [showNoCaptureModal, setShowNoCaptureModal] = React.useState(false);
	const [showBreakpointModal, setShowBreakpointModal] = React.useState(false);
	const [showReachableHostsModal, setShowReachableHostsModal] = React.useState(false);
	const [showMetricsModal, setShowMetricsModal] = React.useState(false);
	const [moreMenuIcon, setMoreMenuIcon] = React.useState<HTMLDivElement | null>(null);
	const [settingsMenuIcon, setSettingsMenuIcon] = React.useState<HTMLDivElement | null>(null);
	const [openExportDialog, setOpenExportDialog] = React.useState(false);
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);
	const [showHelp, setShowHelp] = React.useState(false);
	const [showDarkModeDialog, setShowDarkModeDialog] = React.useState(false);
	const [showNotesModal, setShowNotesModal] = React.useState(false);
	const [showJSONFieldsModal, setShowJSONFieldsModal] = React.useState(false);
	const [jsonFields, setJsonFields] = React.useState<{ name: string, count: number, selected: boolean }[]>([]);
	const [jsonFieldsModalTab, setJsonFieldsModalTab] = React.useState<'jsonFields' | 'scripts' | 'showFields'>('scripts');

	const [openTabFileSelector, { filesContent: tabContent, clear: tabClear }] = useFilePicker({
		multiple: false,
		accept: ['.json', '.allproxy']
	});

	if (!!tabContent.length && tabContent[0].content) {
		mainTabStore.setUpdating(true);
		mainTabStore.importTabFromFile(tabContent[0].name, tabContent[0].content);
		tabClear();
		mainTabStore.setUpdating(false);
	}

	const statusClassName = 'fa ' + (socketStore.isConnected() || urlPathStore.isGitHubPages()
		? 'success fa-circle' : 'error fa-exclamation-triangle');
	return (
		<div className="header__container">
			<div className="header__left-container">
				<div className="header__icon" onClick={() => window.location.reload()}>
					<img src="favicon.ico" alt="AllProxy Debugging Tool"
						width="24" height="24" />
				</div>
				<div className="header__title">
					<Select className="side-bar-select"
						disabled={urlPathStore.isGitHubPages()}
						value={urlPathStore.getApp() === 'jlogviewer'
							? 'jlogviewer'
							: urlPathStore.getApp() === 'mitmproxy'
								? 'mitmproxy'
								: 'allproxy'}
						renderValue={() =>
							<span style={{ fontWeight: 100, fontSize: 'x-large' }}>
								{urlPathStore.getApp() === 'jlogviewer'
									? urlPathStore.isGitHubPages()
										? <b><span style={{ color: '#f50057' }}>JSON</span>Logs</b>
										: <b><span style={{ color: '#f50057' }}>J</span>LogViewer</b>
									: urlPathStore.getApp() === 'mitmproxy'
										? <b><span style={{ color: '#f50057' }}>MITM</span>Proxy</b>
										: <b><span style={{ color: '#f50057' }}>All</span>Proxy</b>
								}
							</span>
						}
						onChange={(e) => urlPathStore.setApp(e.target.value as 'allproxy' | 'mitmproxy' | 'jlogviewer')}
					>
						<MenuItem
							value="allproxy"
						>
							<ListItemText primary="AllProxy" />
						</MenuItem>
						<MenuItem
							value="mitmproxy"
						>
							<ListItemText primary="MitmProxy" />
						</MenuItem>
						<MenuItem
							value="jlogviewer"
						>
							<ListItemText primary="JLogViewer" />
						</MenuItem>
					</Select>
				</div>
				<div className={"header__status " + statusClassName} title="Status" hidden={urlPathStore.isGitHubPages()}></div>

				<div hidden={urlPathStore.getApp() === 'jlogviewer'}
					style={{
						opacity: mainTabStore.isProxyTabSelected() ? undefined : 0.3,
						pointerEvents: mainTabStore.isProxyTabSelected() ? undefined : 'none',
					}}>
					<div className="header__trash fa fa-trash-alt" title="Clear log"
						hidden={urlPathStore.getApp() === 'jlogviewer'}
						onClick={() => {
							messageQueueStore.clear();
							// filterStore.setFilter('');
							socketStore.clearMetrics();
						}}
					/>
					<div className={'header__stop fas '
						+ (messageQueueStore.getStopped() ? 'fa-play' : 'fa-pause')}
						onClick={() => messageQueueStore.toggleStopped()}
						title={(messageQueueStore.getStopped() ? 'Resume recording' : 'Pause recording')}
					/>
				</div>

				<div hidden className={'header__sort-req-res fa-solid fa-arrow-down fas'}
					onClick={() => messageQueueStore.toggleSortBy()}
					title={(messageQueueStore.getSortByReq() ? 'Change to sort by response' : 'Change to sort by request')}
				>
					{messageQueueStore.getSortByReq() ? 'Req' : 'Res'}
				</div>

				<div className={'header__show-errors fa-bug fa '
					+ (filterStore.getShowErrors() ? 'active' : '')}
					hidden={urlPathStore.getApp() === 'jlogviewer'}
					onClick={() => filterStore.toggleShowErrors()}
					title={'Toggle show only errors'}
				/>

				<div className={'header__auto-scroll fa fa-sticky-note'}
					style={{ color: '#E8A317' }}
					onClick={() => {
						setShowNotesModal(true);
					}}
					title={'Add notes'}
				/>

				<div className={'header__auto-scroll fa fa-arrow-up'}
					onClick={() => {
						messageQueueStore.setScrollAction('top');
					}}
					title={'Scroll to top'}
				/>

				<div className={'header__auto-scroll fa fa-arrow-down'}
					onClick={() => {
						messageQueueStore.setScrollAction('bottom');
					}}
					title={'Scroll to bottom'}
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
							opacity: mainTabStore.getTabCount() > 1 ? undefined : 0.3,
							pointerEvents: mainTabStore.getTabCount() > 1 ? undefined : 'none'
						}}
						onClick={() => {
							mainTabStore.deleteAllTabs();
							setMoreMenuIcon(null);
						}}
					>
						<div className="header__folder-minus fa fa-folder-minus" title="Delete all tabs"

						>
							&nbsp;Delete Tabs
						</div>
					</MenuItem>
					{urlPathStore.getApp() !== 'jlogviewer' &&
						<>
							<MenuItem style={{
								opacity: !mainTabStore.isProxyTabSelected() || messageQueueStore.getStopped()
									? undefined : 0.3,
								pointerEvents: !mainTabStore.isProxyTabSelected() || messageQueueStore.getStopped()
									? undefined : 'none'
							}}
								onClick={() => {
									setOpenExportDialog(true);
									setMoreMenuIcon(null);
								}}
							>
								<div className="header__export fa fa-download" title="Export tab to file"
								>
									&nbsp;Export Tab to file
								</div>
							</MenuItem>
							<MenuItem>
								<div className="header__import fa fa-upload" title="Import tab from file"
									onClick={() => {
										openTabFileSelector();
										setMoreMenuIcon(null);
									}}
								>
									&nbsp;Import Tab from file
								</div>
							</MenuItem>
						</>
					}
					<MenuItem
						hidden={urlPathStore.getApp() === 'mitmproxy'}
						onClick={() => {
							setOpenImportJSONFileDialog(true);
							setMoreMenuIcon(null);
						}}>
						<div className="header__import fa fa-file" title="Import JSON log from file"
						>
							&nbsp;Import JSON Log
						</div>
					</MenuItem>
					<MenuItem style={{
						opacity: !mainTabStore.isProxyTabSelected() ? undefined : 0.3,
						pointerEvents: !mainTabStore.isProxyTabSelected() ? undefined : 'none'
					}}
						onClick={() => {
							navigator.clipboard.writeText(mainTabStore.copySelectedTab());
							setMoreMenuIcon(null);
						}}
					>
						<div className="header__export fa fa-copy" title="Copy to clipboard"
						>
							&nbsp;Copy to Clipboard
						</div>
					</MenuItem>
					<MenuItem
						onClick={() => {
							mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.toggleVertical();
							setMoreMenuIcon(null);
						}}
					>
						<div className="header__import fa fa-image" title="Layout"
						>
							&nbsp;{mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.isVertical() ?
								'Set Horizontal Layout' : 'Set Vertical Layout'}
						</div>
					</MenuItem>
				</Menu>

				<div className="header__filter">
					<FilterBar />
				</div>
				<div className={`header__filter-case ${filterStore.matchCase() ? 'active' : ''}`}
					title="Match case" onClick={() => filterStore.toggleMatchCase()}>Aa</div>
				<div className={`header__filter-regex ${filterStore.regex() ? 'active' : ''}`}
					title="Use regular expression" onClick={() => filterStore.toggleRegex()}>.*</div>
				<div className={`header__filter-logical ${filterStore.logical() ? 'active' : ''}`}
					title="Use (), &&, ||, !" onClick={() => filterStore.toggleLogical()}>&&</div>
				<div hidden className={`header__filter-logical ${filterStore.deleteFiltered() ? 'active' : ''}`}
					title="Delete filtered messages" onClick={() => filterStore.toggleDeleteFiltered()}>X</div>
			</div >
			<div>
				<div className="header__settings fa fa-question" title="Help"
					onClick={() => { setShowHelp(true); }}>
				</div>
				<div className="header__settings fa fa-chart-bar" title="Metrics"
					hidden
					onClick={() => { setShowMetricsModal(true); }}>
				</div>
				<div className="header__settings fa fa-network-wired" title="Reachable Hosts"
					hidden
					onClick={() => { setShowReachableHostsModal(true); settingsStore.setConfig(); }}>
				</div>
				<div className={'header__settings fa fa-cog'} title="Settings"
					onClick={(e) => setSettingsMenuIcon(e.currentTarget)}
				/>
				<Menu
					anchorEl={settingsMenuIcon}
					open={Boolean(settingsMenuIcon)}
					onClose={() => setSettingsMenuIcon(null)}
				>
					{urlPathStore.getApp() !== 'jlogviewer' &&
						<>
							<MenuItem
								hidden={!urlPathStore.isLocalhost()}
								onClick={() => {
									setSettingsMenuIcon(null);
									settingsStore.toggleOpenSettingsModal();
									settingsStore.reset();
									if (!messageQueueStore.getStopped()) {
										messageQueueStore.setStopped(true);
										filterWasStopped = true;
									}
								}}>
								<div className="fa fa-network-wired"
								>
									&nbsp;Proxy Configuration
								</div>
							</MenuItem>
							<MenuItem
								hidden={!urlPathStore.isLocalhost()}
								onClick={() => {
									setSettingsMenuIcon(null);
									setShowBreakpointModal(true);
									breakpointStore.init();
								}}>
								<div className="fa fa-bug" title="Breakpoints"
								>
									&nbsp;Breakpoints
								</div>
							</MenuItem>
							<MenuItem
								hidden={!urlPathStore.isLocalhost()}
								onClick={() => {
									setSettingsMenuIcon(null);
									setShowNoCaptureModal(true);
									noCaptureStore.init();
								}}>
								<div className="fa fa-ban" title="No Capture List">
									&nbsp;No Capture List
								</div>
							</MenuItem>
						</>
					}
					{window.darkMode &&
						<MenuItem onClick={() => {
							setSettingsMenuIcon(null);
							setShowDarkModeDialog(true);
						}}>
							<div className="header__import fa fa-image" title="Theme"
							>
								&nbsp;Appearance
							</div>
						</MenuItem>
					}

					<MenuItem
						hidden={urlPathStore.getApp() === 'mitmproxy'}
						onClick={async () => {
							setSettingsMenuIcon(null);
							jsonLogStore.init();
							setJsonFields(getJSONFields());
							setJsonFieldsModalTab('jsonFields');
							setShowJSONFieldsModal(true);
						}}>
						<div className="header__import fa fa-code" title="Theme"
						>
							&nbsp;JSON Logs: Define JSON Fields
						</div>
					</MenuItem>

					<MenuItem
						hidden={urlPathStore.getApp() === 'mitmproxy'}
						onClick={async () => {
							setSettingsMenuIcon(null);
							jsonLogStore.init();
							setJsonFields(getJSONFields());
							setJsonFieldsModalTab('scripts');
							setShowJSONFieldsModal(true);
						}}>
						<div className="header__import fa fa-code" title="Theme"
						>
							&nbsp;JSON Logs: Date, Level, App, Message...
						</div>
					</MenuItem>

					<MenuItem
						hidden={urlPathStore.getApp() === 'mitmproxy'}
						onClick={async () => {
							setSettingsMenuIcon(null);
							jsonLogStore.init();
							setJsonFields(getJSONFields());
							setJsonFieldsModalTab('showFields');
							setShowJSONFieldsModal(true);
						}}>
						<div className="header__import fa fa-code" title="Theme"
						>
							&nbsp;JSON Logs: Spreadsheet
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
				initTabValue={HostStatus.Reachable}
			/>
			<SettingsModal
				open={settingsStore.getOpenSettingsModal()}
				onClose={() => {
					settingsStore.toggleOpenSettingsModal();
					if (filterWasStopped) {
						filterWasStopped = false;
						messageQueueStore.setStopped(false);
					}
				}}
				store={settingsStore}
			/>
			<BreakpointModal
				open={showBreakpointModal}
				onClose={() => {
					setShowBreakpointModal(false);
				}}
				store={breakpointStore}
			/>
			<NoCaptureModal
				open={showNoCaptureModal}
				onClose={() => {
					setShowNoCaptureModal(false);
				}}
				store={noCaptureStore}
			/>
			<ExportDialog
				open={openExportDialog}
				heading={"Tab Name"}
				buttonLabel={'Export'}
				onClose={(fileName) => {
					setOpenExportDialog(false);
					if (fileName.length > 0) {
						mainTabStore.exportSelectedTab(fileName);
					}
				}}
			/>
			<ImportJSONFileDialog
				open={openImportJSONFileDialog}
				onClose={() => {
					setOpenImportJSONFileDialog(false);
				}}
			/>
			<HelpDialog open={showHelp} onClose={async () => {
				setShowHelp(false);
				jsonLogStore.init();
				jsonLogStore.updateScriptFunc();
				mainTabStore.setUpdating(true);
				setTimeout(() => {
					updateJSONRequestLabels();
					mainTabStore.setUpdating(false);
				});
			}} />
			<DarkModeDialog open={showDarkModeDialog} onClose={() => {
				setShowDarkModeDialog(false);
			}} />
			{
				showJSONFieldsModal &&
				<JSONFieldsModal
					open={showJSONFieldsModal}
					onClose={() => {
						setShowJSONFieldsModal(false);
						mainTabStore.setUpdating(true);
						setTimeout(() => {
							updateJSONRequestLabels();
							mainTabStore.setUpdating(false);
						});
					}}
					store={jsonLogStore}
					jsonFields={jsonFields}
					selectTab={jsonFieldsModalTab}
				/>
			}
			<NotesModal
				open={showNotesModal}
				onClose={() => {
					setShowNotesModal(false);
				}}
			/>
		</div >
	);
});

export default Header;