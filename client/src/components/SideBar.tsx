import { Checkbox, CircularProgress, ListItemText, Menu, MenuItem, Select } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { filterStore } from "../store/FilterStore";
import { messageQueueStore } from "../store/MessageQueueStore";
import SideBarSortBy from "./SideBarSortBy";
import SessionModal from './SessionModal';
import { sessionStore } from '../store/SessionStore';
import ExportDialog from "./ExportDialog";
import React from "react";
import MessageStore from "../store/MessageStore";
import { mainTabStore } from "../store/MainTabStore";
import { useFilePicker } from "use-file-picker";
import ImportJSONFileDialog from "./ImportJSONFileDialog";
import { urlPathStore } from "../store/UrlPathStore";
import SideBarNamedQueries from "./SideBarQueries";
import SideBarSettings from "./SideBarSettings";
import SideBarJsonSettings from "./SideBarJsonSettings";
import { stringToDate } from "./Footer";

export const isJsonLogTab = () => {
	const messages = mainTabStore.getSelectedMessages();
	return messages.length > 0 && messages[0].getMessage().protocol === 'log:';
};

const SideBar = observer(() => {
	const [openSaveSessionDialog, setOpenSaveSessionDialog] = React.useState(false);
	const [showSessionModal, setShowSessionModal] = React.useState(false);
	const [disableSaveSession, setDisableSession] = React.useState(false);
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);
	const [timeChanged, setTimeChanged] = React.useState(false);

	function handleSet() {
		filterStore.filterUpdated();
		setTimeChanged(false);
	}

	function handleClear() {
		filterStore.setStartTime('');
		filterStore.setEndTime('');
		filterStore.filterUpdated();
	}

	const [openTabFileSelector, { filesContent: tabContent, clear: tabClear }] = useFilePicker({
		multiple: false,
		accept: ".allproxy"
	});

	if (!!tabContent.length && tabContent[0].content) {
		mainTabStore.setUpdating(true);
		mainTabStore.importTabFromFile(tabContent[0].name, tabContent[0].content);
		tabClear();
		mainTabStore.setUpdating(false);
	}

	const areAllDomainsSelected = (): boolean => {
		const allDomains = filterStore.getSideBarDomains();
		for (const domain of allDomains) if (!filterStore.isSideBarDomainChecked(domain)) return false;
		return true;
	};

	const handleAllDomainChange = () => {
		const allDomains = filterStore.getSideBarDomains();
		if (areAllDomainsSelected()) {
			allDomains.forEach((domain) => filterStore.setSideBarDomainChecked(domain, false));
		} else {
			allDomains.forEach((domain) => filterStore.setSideBarDomainChecked(domain, true));
		}
	};

	const areAllUserAgentsSelected = (): boolean => {
		const allUserAgents = filterStore.getSideBarUserAgents();
		for (const userAgent of allUserAgents) if (!filterStore.isSideBarUserAgentChecked(userAgent)) return false;
		return true;
	};

	const handleAllUserAgentChange = () => {
		const allUserAgents = filterStore.getSideBarUserAgents();
		if (areAllUserAgentsSelected()) {
			allUserAgents.forEach((userAgent) => filterStore.setSideBarUserAgentChecked(userAgent, false));
		} else {
			allUserAgents.forEach((userAgent) => filterStore.setSideBarUserAgentChecked(userAgent, true));
		}
	};

	const areAllStatusesSelected = (): boolean => {
		const statuses = filterStore.getSideBarStatuses();
		for (const status of statuses) if (!filterStore.isSideBarStatusChecked(status)) return false;
		return true;
	};

	const handleAllStatusChange = () => {
		const statuses = filterStore.getSideBarStatuses();
		if (areAllStatusesSelected()) {
			statuses.forEach((status) => filterStore.setSideBarStatusChecked(status, false));
		} else {
			statuses.forEach((status) => filterStore.setSideBarStatusChecked(status, true));
		}
	};

	let countsByIconClassMap: Map<string, number> = new Map();
	let countsByStatusMap: Map<number, number> = new Map();
	let noteMessages: MessageStore[] = [];
	// let visitedMessages: MessageStore[] = [];

	function getCounts() {
		messageQueueStore.getMessages().forEach((messageStore) => {
			if (messageStore.hasNote()) {
				noteMessages.push(messageStore);
			}
			// if (messageStore.getVisited()) {
			// 	visitedMessages.push(messageStore);
			// }

			const iconClass = messageStore.getIconClass();
			let count = countsByIconClassMap.get(iconClass);
			if (count) {
				countsByIconClassMap.set(iconClass, count + 1);
			} else {
				countsByIconClassMap.set(iconClass, 1);
			}

			const status = messageStore.getMessage().status;
			if (!status) return;
			count = countsByStatusMap.get(status);
			if (count) {
				countsByStatusMap.set(status, count + 1);
			} else {
				countsByStatusMap.set(status, 1);
			}
		});
	}

	getCounts();

	function getIconClassCountByIconClass(iconClass: string): number {
		const count = countsByIconClassMap.get(iconClass);
		return count ? count : 0;
	}

	function getStatusCount(status: number): number {
		const count = countsByStatusMap.get(status);
		return count ? count : 0;
	}

	function getDomains(): Map<string, number> {
		const countsByDomainMap: Map<string, number> = new Map();
		messageQueueStore.getMessages().forEach((messageStore) => {
			const domain = messageStore.getDomain();
			if (!domain) return;
			const count = countsByDomainMap.get(domain);
			if (count) {
				countsByDomainMap.set(domain, count + 1);
			} else {
				countsByDomainMap.set(domain, 1);
			}
		});
		return countsByDomainMap;
	}

	const domains = Array.from(getDomains().keys());

	function getUserAgents(): Map<string, number> {
		const countsByUserAgentMap: Map<string, number> = new Map();
		messageQueueStore.getMessages().forEach((messageStore) => {
			const userAgent = messageStore.getUserAgentDisplayable();
			if (!userAgent) return;
			const count = countsByUserAgentMap.get(userAgent);
			if (count) {
				countsByUserAgentMap.set(userAgent, count + 1);
			} else {
				countsByUserAgentMap.set(userAgent, 1);
			}
		});
		return countsByUserAgentMap;
	}

	const userAgents = Array.from(getUserAgents().keys());

	const buttonWidth = '100%';

	return (
		<>
			<div className="side-bar">
				<div className="side-bar-header">
					<div className="side-bar-item">
						<button className="btn btn-success"
							style={{ width: buttonWidth }}
							disabled={disableSaveSession}
							onClick={() => { setOpenSaveSessionDialog(true); setDisableSession(true); }}>
							Save Session
						</button>
						{disableSaveSession &&
							<div style={{ zIndex: 99, position: 'absolute', marginLeft: '5ch' }}>
								<CircularProgress />
							</div>
						}
					</div>
					<div className="side-bar-item">
						<button className="btn btn-primary"
							style={{ width: buttonWidth }}
							onClick={() => { sessionStore.init(); setShowSessionModal(true); }}>
							Restore Session
						</button>
					</div>
					<div className="side-bar-item">
						<button className="btn btn-secondary"
							style={{ width: buttonWidth }}
							onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
								setAnchorEl(event.currentTarget);
							}}>
							Import
						</button>
						<Menu
							anchorEl={anchorEl}
							open={Boolean(anchorEl)}
							onClose={() => { setAnchorEl(null); }}
						>
							<MenuItem hidden={urlPathStore.getKind() === 'mitmproxy'}>
								<div className="header__import fa fa-file" title="Import JSON or JSON Lines"
									onClick={() => {
										setAnchorEl(null);
										setOpenImportJSONFileDialog(true);
									}}
								>
									&nbsp;Import JSON/JSON Lines
								</div>
							</MenuItem>
							<MenuItem hidden={urlPathStore.getKind() === 'jlogviewer'}>
								<div className="header__import fa fa-upload" title="Import tab from file"
									onClick={() => {
										setAnchorEl(null);
										openTabFileSelector();
									}}
								>
									&nbsp;Import Tab from file
								</div>
							</MenuItem>
							<MenuItem>
								<div className="header__import fa fa-upload" title="Import session from zip file"
									onClick={() => {
										setAnchorEl(null);
										sessionStore.importSession();
									}}
								>
									&nbsp;Import Session from zip file
								</div>
							</MenuItem>
						</Menu>
					</div>
				</div>
				<div>
					<div className="side-bar-item">
						<input className="footer-input form-control"
							style={getInputStyle(filterStore.getStartTime())}
							type="text"
							placeholder="Start Time"
							value={filterStore.getStartTime()}
							onChange={(e) => { filterStore.setStartTime(e.target.value); setTimeChanged(e.target.value.length > 0); }}
						/>
					</div>
					<div className="side-bar-item">
						<input className="footer-input form-control"
							style={getInputStyle(filterStore.getEndTime())}
							type="text"
							placeholder="End Time"
							value={filterStore.getEndTime()}
							onChange={(e) => { filterStore.setEndTime(e.target.value); setTimeChanged(e.target.value.length > 0); }}
						/>
					</div>
					<div className="side-bar-item">
						<button className="btn btn-success" style={{ width: '96px' }}
							disabled={!timeChanged || !stringToDate(filterStore.getStartTime()).ok || !stringToDate(filterStore.getEndTime()).ok}
							onClick={handleSet}
						>
							Set Time
						</button>
						<button className="btn btn-secondary" style={{ marginLeft: '.25rem', width: '96px' }}
							onClick={handleClear}
						>
							Clear Time
						</button>
					</div>
				</div>
				<div className="side-bar-scroll">
					<div>
						<SideBarSettings />
					</div>

					<div style={{ marginTop: '.5rem' }}>
						<SideBarNamedQueries />
					</div>

					<div hidden>
						<SideBarSortBy></SideBarSortBy>
					</div>

					<div hidden>
						<SideBarJsonSettings />
					</div>

					{noteMessages.length > 0 && (
						<div className="side-bar-item">
							<Select className="side-bar-select"
								value={noteMessages}
								renderValue={() => "Notes"}
							>
								{noteMessages.map((message) => (
									<MenuItem onClick={() => messageQueueStore.setScrollToSeqNum(message.getMessage().sequenceNumber)}>
										{message.getNote()}
									</MenuItem>
								))}
							</Select>
						</div>
					)}

					{false && filterStore.getSideBarProtocolIconClasses().length > 0 && (
						<>
							<hr className="side-bar-divider"></hr>
							{
								filterStore.getSideBarProtocolIconClasses().sort().map((iconClass) => {
									return getIconClassCountByIconClass(iconClass) > 0 ?
										<div key={iconClass}>
											<div className="side-bar-item">
												<div className="side-bar-checkbox-icon">
													<div style={{ display: 'flex' }}>
														<Checkbox className="side-bar-checkbox"
															size="small"
															defaultChecked
															value={filterStore.isSideBarProtocolChecked(iconClass)}
															onChange={() => filterStore.toggleSideBarProtocolChecked(iconClass)} />
														<div className={`${iconClass} side-bar-icon`} />
														<div className="side-bar-small-count">{getIconClassCountByIconClass(iconClass)}</div>
													</div>
												</div>
											</div>
										</div>
										:
										null;
								})
							}
						</>
					)}

					{false && !isJsonLogTab() && filterStore.getSideBarDomains().length > 0 &&
						<div>
							<div className="side-bar-item">
								<Select className="side-bar-select"
									multiple
									value={domains.concat('all')}
									renderValue={() => "Host Names"}
								>
									<MenuItem
										value="all"
									>
										<Checkbox className="side-bar-domain-checkbox"
											checked={areAllDomainsSelected()}
											onChange={handleAllDomainChange} />
										<ListItemText
											primary="Select All" />
									</MenuItem>
									{domains.sort().map((domain) => (
										<MenuItem key={domain} value={domain}>
											<Checkbox className="side-bar-domain-checkbox"
												checked={filterStore.isSideBarDomainChecked(domain)}
												onChange={() => filterStore.toggleSideBarDomainChecked(domain)} />
											<ListItemText primary={domain} />
										</MenuItem>
									))}
								</Select>
							</div>
						</div>}
					{false && !isJsonLogTab() && filterStore.getSideBarUserAgents().length > 0 &&
						<div>
							<div className="side-bar-item">
								<Select className="side-bar-select"
									multiple
									value={userAgents.concat('all')}
									renderValue={() => "User Agents"}
								>
									<MenuItem
										value="all"
									>
										<Checkbox className="side-bar-domain-checkbox"
											checked={areAllUserAgentsSelected()}
											onChange={handleAllUserAgentChange} />
										<ListItemText
											primary="Select All" />
									</MenuItem>
									{userAgents.sort().map((userAgent) => (
										<MenuItem key={userAgent} value={userAgent}>
											<Checkbox className="side-bar-domain-checkbox"
												checked={filterStore.isSideBarUserAgentChecked(userAgent)}
												onChange={() => filterStore.toggleSideBarUserAgentChecked(userAgent)} />
											<ListItemText primary={userAgent} />
										</MenuItem>
									))}
								</Select>
							</div>
						</div>}

					{false && !isJsonLogTab() && (filterStore.getSideBarStatuses().length > 0) && (
						<hr className="side-bar-divider"></hr>
					)}

					{false && !isJsonLogTab() && (filterStore.getSideBarStatuses().length > 0) && (
						<div className="side-bar-item">
							<div>
								<div style={{ whiteSpace: 'nowrap' }}>Status:</div>
								<div style={{ display: 'flex' }}>
									<Checkbox className="side-bar-checkbox"
										size="small"
										checked={areAllStatusesSelected()}
										onChange={handleAllStatusChange} />
									<div>All</div>
								</div>
								{filterStore.getSideBarStatuses().sort().map((status) => (
									<div key={status} hidden={getStatusCount(status) === 0}>
										<div style={{ display: 'flex' }}>
											<Checkbox className="side-bar-checkbox"
												size="small"
												checked={filterStore.isSideBarStatusChecked(status)}
												onChange={() => filterStore.toggleSideBarStatusChecked(status)} />
											<div className="side-bar-status">{status}</div>
											<div className="side-bar-small-count">{getStatusCount(status)}</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

				</div >
			</div >
			<ExportDialog
				open={openSaveSessionDialog}
				heading={"Enter Session Name"}
				buttonLabel={'Save'}
				onClose={async (fileName) => {
					setOpenSaveSessionDialog(false);
					if (fileName.length > 0) {
						await sessionStore.saveSession(fileName);
					}
					setDisableSession(false);
				}} />
			<SessionModal
				open={showSessionModal}
				onClose={() => setShowSessionModal(false)}
				store={sessionStore}
			/>
			<ImportJSONFileDialog
				open={openImportJSONFileDialog}
				onClose={() => {
					setOpenImportJSONFileDialog(false);
				}}
			/>
		</>
	);

	function getInputStyle(time: string) {
		if (time.length === 0) {
			return {
				color: 'rgba(232, 230, 227)',
				backgroundColor: '#444444'
			};
		}

		const ok = stringToDate(time).ok;
		const style = {
			background: (ok ? (timeChanged ? '#fffac8' : 'lightGreen') : 'lightCoral'),
			color: 'black'
		};
		return style;
	}

});

export default SideBar;