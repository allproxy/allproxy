import { Checkbox } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { filterStore } from "../store/FilterStore";

const SideBar = observer(() => {
	return (
		<div className="side-bar">
		{
			filterStore.getSideBarIconClasses().map((iconClass) => (
				<div className="side-bar-protocol" key={iconClass}>
					{/* <div className="side-bar-item">
						<div className="side-bar-count">{entry.count}</div>
					</div> */}
					<div className="side-bar-item">
						<div className="side-bar-checkbox-icon">
							<Checkbox className="side-bar-checkbox"
										size="small"
										defaultChecked
										value={filterStore.isSideBarChecked(iconClass)}
										onChange={() => filterStore.toggleSideBarChecked(iconClass)}
							/>
							<div className={`${iconClass} side-bar-icon`}/>
						</div>
					</div>
				</div>
				)
			)
		}
		</div>
	)
});

export default SideBar;