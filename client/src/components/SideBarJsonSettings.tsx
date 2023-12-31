import { Select, MenuItem, ListItemText } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { jsonLogStore, updateJSONRequestLabels } from "../store/JSONLogStore";
import { mainTabStore } from "../store/MainTabStore";
import { messageQueueStore } from "../store/MessageQueueStore";
import { isJsonLogTab } from "./SideBar";


const SideBarJsonSettings = observer((): JSX.Element => {
	const handleJsonMethodChange = (e: any) => {
		jsonLogStore.setParsingMethod(e.target.value as 'auto' | 'simple' | 'advanced');
		mainTabStore.setUpdating(true);
		setTimeout(() => {
			updateJSONRequestLabels();
			mainTabStore.setUpdating(false);
			messageQueueStore.setScrollToSeqNum(messageQueueStore.getHighlightSeqNum());
		});
	};
	const getJSONParsingMethodDisplayName = () => {
		const method = jsonLogStore.getParsingMethod();
		if (method.substring == undefined) {
			console.log('substring undefined', method);
			return 'Method undefined';
		}
		return method.substring(0, 1).toUpperCase() + method.substring(1);
	};

	const handleJsonMaxFieldLevelChange = (e: any) => {
		const level = e.target.value === '1' ? 1 : 2;
		jsonLogStore.setAutoMaxFieldLevel(level);
		mainTabStore.setUpdating(true);
		setTimeout(() => {
			updateJSONRequestLabels();
			mainTabStore.setUpdating(false);
			messageQueueStore.setScrollToSeqNum(messageQueueStore.getHighlightSeqNum());
		});
	};

	return (
		<>
			<hr className="side-bar-divider"
				hidden={!isJsonLogTab()}></hr>
			<div hidden={!isJsonLogTab()}>
				{/* <div style={{ paddingLeft: '.5rem' }}>JSON SETTINGS</div> */}
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
			</div>
		</>
	);
});

export default SideBarJsonSettings;