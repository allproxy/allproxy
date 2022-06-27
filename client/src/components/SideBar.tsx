import { Checkbox, ListItemText, MenuItem, Select } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { filterStore } from "../store/FilterStore";

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

	return (
		<div className="side-bar">
			{
				filterStore.getSideBarProtocolIconClasses().map((iconClass) => (
					<div key={iconClass}>
						<div className="side-bar-item">
							<div className="side-bar-checkbox-icon">
								<Checkbox className="side-bar-checkbox"
									size="small"
									defaultChecked
									value={filterStore.isSideBarProtocolChecked(iconClass)}
									onChange={() => filterStore.toggleSideBarProtocolChecked(iconClass)}
								/>
								<div className={`${iconClass} side-bar-icon`} />
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
							value={filterStore.getSideBarDomains()}
							renderValue={() => "Domains"}
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
							{filterStore.getSideBarDomains().map((domain) => (
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
							value={filterStore.getSideBarUserAgents()}
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
							{filterStore.getSideBarUserAgents().map((userAgent) => (
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