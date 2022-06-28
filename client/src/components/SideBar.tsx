import { Checkbox, ListItemText, MenuItem, Select } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { filterStore } from "../store/FilterStore";
import { messageQueueStore } from "../store/MessageQueueStore";

const SideBar = observer(() => {

	const areAllDomainsSelected = (): boolean => {
		const allDomains = filterStore.getSideBarDomains();
		for (const domain of allDomains) if (!filterStore.isSideBarDomainChecked(domain)) return false;
		return true;
	}

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
	}

	const handleAllUserAgentChange = () => {
		const allUserAgents = filterStore.getSideBarUserAgents();
		if (areAllUserAgentsSelected()) {
			allUserAgents.forEach((userAgent) => filterStore.setSideBarUserAgentChecked(userAgent, false));
		} else {
			allUserAgents.forEach((userAgent) => filterStore.setSideBarUserAgentChecked(userAgent, true));
		}
	};

	function getIconClassCounts(): Map<string, number> {
		const countsByIconClassMap: Map<string, number> = new Map();
		messageQueueStore.getMessages().forEach((messageStore) => {
			const iconClass = messageStore.getIconClass();
			const count = countsByIconClassMap.get(iconClass);
			if (count) {
				countsByIconClassMap.set(iconClass, count + 1);
			} else {
				countsByIconClassMap.set(iconClass, 1);
			}
		})
		return countsByIconClassMap;
	}

	const iconClassCounts = getIconClassCounts();

	function getIconClassCountByIconClass(iconClass: string): number {
		const count = iconClassCounts.get(iconClass);
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
		})
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
		})
		return countsByUserAgentMap;
	}

	const userAgents = Array.from(getUserAgents().keys());

	return (
		<div className="side-bar">
			{
				filterStore.getSideBarProtocolIconClasses().map((iconClass) => (
					<div key={iconClass}>
						<div className="side-bar-item">
							<div className="side-bar-checkbox-icon">
								<div style={{ display: 'flex' }}>
									<Checkbox className="side-bar-checkbox"
										size="small"
										defaultChecked
										value={filterStore.isSideBarProtocolChecked(iconClass)}
										onChange={() => filterStore.toggleSideBarProtocolChecked(iconClass)}
									/>
									<div className={`${iconClass} side-bar-icon`} />
									<div className="side-bar-protocol-count">{getIconClassCountByIconClass(iconClass)}</div>
								</div>
							</div>
						</div>
					</div>
				)
				)
			}

			{
				(filterStore.getSideBarDomains().length > 0 || filterStore.getSideBarUserAgents().length > 0) &&
				<hr className="side-bar-divider"></hr>
			}

			{
				filterStore.getSideBarDomains().length > 0 &&
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
									onChange={handleAllDomainChange}
								/>
								<ListItemText
									primary="Select All"
								/>
							</MenuItem>
							{domains.map((domain) => (
								<MenuItem key={domain} value={domain}>
									<Checkbox className="side-bar-domain-checkbox"
										checked={filterStore.isSideBarDomainChecked(domain)}
										onChange={() => filterStore.toggleSideBarDomainChecked(domain)}
									/>
									<ListItemText primary={domain} />
								</MenuItem>
							))}
						</Select>
					</div>
				</div>
			}
			{
				filterStore.getSideBarUserAgents().length > 0 &&
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
									onChange={handleAllUserAgentChange}
								/>
								<ListItemText
									primary="Select All"
								/>
							</MenuItem>
							{userAgents.map((userAgent) => (
								<MenuItem key={userAgent} value={userAgent}>
									<Checkbox className="side-bar-domain-checkbox"
										checked={filterStore.isSideBarUserAgentChecked(userAgent)}
										onChange={() => filterStore.toggleSideBarUserAgentChecked(userAgent)}
									/>
									<ListItemText primary={userAgent} />
								</MenuItem>
							))}
						</Select>
					</div>
				</div>
			}
		</div >
	)
});

export default SideBar;