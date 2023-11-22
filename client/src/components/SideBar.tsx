import { Checkbox, CircularProgress, ListItemText, Menu, MenuItem, Select } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { filterStore } from "../store/FilterStore";
import { messageQueueStore } from "../store/MessageQueueStore";
import SortBy from "./SortBy";
import SessionModal from './SessionModal';
import { sessionStore } from '../store/SessionStore';
import ExportDialog from "./ExportDialog";
import React from "react";
import MessageStore from "../store/MessageStore";
import { snapshotStore } from "../store/SnapshotStore";
import { useFilePicker } from "use-file-picker";
import ImportJSONFileDialog from "./ImportJSONFileDialog";
import { logViewerStore } from "../store/LogViewerStore";
import { jsonLogStore, updateJSONRequestLabels } from "../store/JSONLogStore";

const SideBar = observer(() => {
	const [openSaveSessionDialog, setOpenSaveSessionDialog] = React.useState(false);
	const [showSessionModal, setShowSessionModal] = React.useState(false);
	const [disableSaveSession, setDisableSession] = React.useState(false);
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);

	const [openSnapshotFileSelector, { filesContent: snapshotContent, clear: snapshotClear }] = useFilePicker({
		multiple: false,
		accept: ".allproxy"
	});

	if (!!snapshotContent.length && snapshotContent[0].content) {
		snapshotStore.setUpdating(true);
		snapshotStore.importSnapshot(snapshotContent[0].name, snapshotContent[0].content);
		snapshotClear();
		snapshotStore.setUpdating(false);
	}

	const isJsonLogViewer = () => {
		return snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName()).length > 0;
	};

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

	const handleJsonMethodChange = (e: any) => {
		jsonLogStore.setParsingMethod(e.target.value as 'auto' | 'simple' | 'advanced');
		snapshotStore.setUpdating(true);
		setTimeout(() => {
			updateJSONRequestLabels();
			snapshotStore.setUpdating(false);
		});
	};
	const getJSONParsingMethodDisplayName = () => {
		const method = jsonLogStore.getParsingMethod();
		return method.substring(0, 1).toUpperCase() + method.substring(1);
	};

	const handleJsonMaxFieldLevelChange = (e: any) => {
		const level = e.target.value === '1' ? 1 : 2;
		jsonLogStore.setAutoMaxFieldLevel(level);
		snapshotStore.setUpdating(true);
		setTimeout(() => {
			updateJSONRequestLabels();
			snapshotStore.setUpdating(false);
		});
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

	return (
		<><div className="side-bar">
			<div className="side-bar-item">
				<button className="btn btn-success"
					disabled={disableSaveSession}
					onClick={() => { setOpenSaveSessionDialog(true); setDisableSession(true); }}>
					<div style={{ width: '11.5ch' }}>
						Save Session
					</div>
				</button>
				{disableSaveSession &&
					<div style={{ zIndex: 99, position: 'absolute', marginLeft: '5ch' }}>
						<CircularProgress />
					</div>
				}
			</div>
			<div className="side-bar-item">
				<button className="btn btn-primary"
					style={{ width: '142.29' }}
					onClick={() => { sessionStore.init(); setShowSessionModal(true); }}>
					<div style={{ width: '11.5ch' }}>Restore Session</div>
				</button>
			</div>
			<hr className="side-bar-divider"></hr>
			<div className="side-bar-item">
				<button className="btn btn-primary"
					style={{ width: '142.29' }}
					onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
						{
							logViewerStore.isLogViewer()
								? setOpenImportJSONFileDialog(true)
								: setAnchorEl(event.currentTarget);
						}
					}}>
					<div style={{ width: '11.5ch' }}>Import</div>
				</button>
				<Menu
					anchorEl={anchorEl}
					open={Boolean(anchorEl)}
					onClose={() => { setAnchorEl(null); }}
				>
					<MenuItem>
						<div className="header__import fa fa-file" title="Import JSON file"
							onClick={() => {
								setAnchorEl(null);
								setOpenImportJSONFileDialog(true);
							}}
						>
							&nbsp;Import JSON Log
						</div>
					</MenuItem>
					<MenuItem>
						<div className="header__import fa fa-upload" title="Import snapshot file"
							onClick={() => {
								setAnchorEl(null);
								openSnapshotFileSelector();
							}}
						>
							&nbsp;Import Snapshot
						</div>
					</MenuItem>
				</Menu>
			</div>
			<hr className="side-bar-divider" hidden={!isJsonLogViewer()}></hr>
			{isJsonLogViewer() &&
				<div>
					<div style={{ paddingLeft: '.5rem' }}>JSON SETTINGS</div>
					<div>
						<div className="side-bar-item">
							<div>
								<div>Parsing Method:</div>
								<div style={{ paddingLeft: '.5rem' }}>
									<Select className="side-bar-select"
										value={jsonLogStore.getParsingMethod()}
										renderValue={() => getJSONParsingMethodDisplayName()}
										onChange={handleJsonMethodChange}
									>
										<MenuItem
											value="auto"
										>
											<ListItemText primary="Auto" />
										</MenuItem>
										<MenuItem
											value="simple"
										>
											<ListItemText primary="Simple" />
										</MenuItem>
										<MenuItem
											value="advanced"
										>
											<ListItemText primary="Advanced" />
										</MenuItem>
									</Select>
								</div>
							</div>
						</div>
						{jsonLogStore.getParsingMethod() === 'auto' &&
							<div style={{ paddingLeft: '.5rem' }}>
								<div>
									<div>Max Field Level:</div>
									<div style={{ marginLeft: '.5rem' }}>
										<Select className="side-bar-select"
											value={jsonLogStore.getAutoMaxFieldLevel()}
											renderValue={() => jsonLogStore.getAutoMaxFieldLevel()}
											onChange={handleJsonMaxFieldLevelChange}
										>
											<MenuItem
												value="1"
											>
												<ListItemText primary="1" />
											</MenuItem>
											<MenuItem
												value="2"
											>
												<ListItemText primary="2" />
											</MenuItem>
										</Select>
									</div>
								</div>
							</div>}
					</div>
				</div>}
			<hr className="side-bar-divider" hidden={isJsonLogViewer()}></hr>
			<div className="side-bar-item" hidden={isJsonLogViewer()}>
				<div>
					<div hidden style={{ display: 'flex' }}>
						<Checkbox className="side-bar-checkbox"
							size="small"
							checked={messageQueueStore.getSaveQueriesFeature()}
							value={messageQueueStore.getSaveQueriesFeature()}
							onChange={() => messageQueueStore.toggleSaveQueriesFeature()} />
						Save Queries
					</div>
					<div style={{ display: 'flex' }} hidden>
						<Checkbox className="side-bar-checkbox"
							size="small"
							checked={messageQueueStore.getFullPageSearch()}
							value={messageQueueStore.getFullPageSearch()}
							onChange={() => messageQueueStore.toggleFullPageSearch()} />
						Full Page Search
					</div>
					{!logViewerStore.isLogViewer() &&
						<>
							<div hidden={isJsonLogViewer()} style={{ display: 'flex' }}>
								<Checkbox className="side-bar-checkbox"
									size="small"
									checked={messageQueueStore.getShowAPI()}
									value={messageQueueStore.getShowAPI()}
									onChange={() => messageQueueStore.toggleShowAPI()} />
								Show API
							</div>
							<div hidden style={{ display: 'flex' }}>
								<Checkbox className="side-bar-checkbox"
									size="small"
									value={messageQueueStore.getShowTooltip()}
									onChange={() => messageQueueStore.toggleShowTooltip()} />
								Show Tooltip
							</div><div hidden={isJsonLogViewer()} style={{ display: 'flex' }}>
								<Checkbox className="side-bar-checkbox"
									size="small"
									value={messageQueueStore.getShowUserAgent()}
									onChange={() => messageQueueStore.toggleShowRequestUA()} />
								Show User Agent
							</div>
						</>
					}
				</div>
			</div>

			{/* {visitedMessages.length > 0 && (
				<><hr className="side-bar-divider"></hr><div>
					<div className="side-bar-item">
						<Select className="side-bar-select"
							value={visitedMessages}
							renderValue={() => "Visited"}
						>
							{visitedMessages.map((message) => (
								<MenuItem onClick={() => messageQueueStore.setScrollToSeqNum(message.getMessage().sequenceNumber)}>
									{getRequestLine(message)}
								</MenuItem>
							))}
						</Select>
					</div>
				</div></>
			)} */}

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

			{filterStore.getSideBarProtocolIconClasses().length > 0 && (
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

			<hr className="side-bar-divider"></hr>

			<div>
				<SortBy></SortBy>
			</div>

			{!isJsonLogViewer() && filterStore.getSideBarDomains().length > 0 &&
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
			{!isJsonLogViewer() && filterStore.getSideBarUserAgents().length > 0 &&
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

			{!isJsonLogViewer() && (filterStore.getSideBarStatuses().length > 0) && (
				<hr className="side-bar-divider"></hr>
			)}

			{!isJsonLogViewer() && (filterStore.getSideBarStatuses().length > 0) && (
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
			<ExportDialog
				open={openSaveSessionDialog}
				heading={"Enter Session Name"}
				name={''}
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
});

export default SideBar;