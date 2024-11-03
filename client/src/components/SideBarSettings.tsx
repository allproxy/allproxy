import { Checkbox, MenuItem, Select } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { messageQueueStore } from '../store/MessageQueueStore';
import { isJsonLogTab } from './SideBar';
import { filterStore } from '../store/FilterStore';
import { jsonLogStore } from '../store/JSONLogStore';
import { mainTabStore } from '../store/MainTabStore';
import { urlPathStore } from '../store/UrlPathStore';
import StarHalf from '@mui/icons-material/StarHalf';

const SideBarSettings = observer((): JSX.Element => {
	return (
		<>
			{/* <hr className="side-bar-divider" hidden={isJsonLogTab() || urlPathStore.getKind() === 'jlogviewer'}></hr> */}
			<div className="side-bar-item" hidden={isJsonLogTab() || urlPathStore.getKind() === 'jlogviewer'}>
				<div>
					<div className="side-bar-item">
						<Select className="side-bar-select"
							//IconComponent={""}
							value={messageQueueStore.getLayout()}
							renderValue={() => messageQueueStore.getLayout() + ' Layout'}
						>
							<MenuItem value="Default" onClick={() => messageQueueStore.setLayout('Default')}>
								Default Layout
							</MenuItem>
							<MenuItem value="Search Match" onClick={() => messageQueueStore.setLayout('Search Match')}>
								Search Match Layout
							</MenuItem>
							<MenuItem value="Raw Response" onClick={() => messageQueueStore.setLayout('Raw Response')}>
								Raw Response Layout
							</MenuItem>
						</Select>
					</div>
					<div style={{ display: 'flex' }}>
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
					</div><div style={{ display: 'flex' }}>
						<Checkbox className="side-bar-checkbox"
							size="small"
							value={messageQueueStore.getShowUserAgent()}
							onChange={() => messageQueueStore.toggleShowRequestUA()} />
						Show User Agent
					</div>
				</div>
			</div>

			<div className="side-bar-item" hidden={!isJsonLogTab()}>
				<div>
					<div className="side-bar-checkbox-icon"
						hidden={jsonLogStore.getParsingMethod() === 'auto'}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={jsonLogStore.isShowUtcChecked()}
								onChange={() => jsonLogStore.toggleShowUtcChecked()} />
							<div>UTC Time</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon"
						hidden={jsonLogStore.getParsingMethod() === 'auto' || jsonLogStore.getParsingMethod() === 'simple'}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={!jsonLogStore.isBriefChecked()}
								value={!jsonLogStore.isBriefChecked()}
								onChange={() => jsonLogStore.toggleBriefChecked()} />
							<div>More Detail (show <StarHalf style={{ fontSize: '1rem' }} />)</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon">
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={jsonLogStore.isRawJsonChecked()}
								onChange={() => jsonLogStore.toggleRawJsonChecked()} />
							<div>Show Raw JSON</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon">
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.isNowrap()}
								onChange={() => mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.toggleNowrap()} />
							<div>No Line Wrap</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon" hidden={!filterStore.canDedup()}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={filterStore.isDedupChecked()}
								onChange={() => filterStore.toggleDedupChecked()} />
							<div>Deduplication</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
});

export default SideBarSettings;