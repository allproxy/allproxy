import { Accordion, AccordionDetails, AccordionSummary, Checkbox } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { messageQueueStore } from '../store/MessageQueueStore';
import { isJsonLogTab } from './SideBar';

const SideBarSettings = observer((): JSX.Element => {
	return (
		<>
			<hr className="side-bar-divider" hidden={isJsonLogTab()}></hr>
			< Accordion hidden={isJsonLogTab()}>
				<AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'whitesmoke' }} />} style={{ backgroundColor: '#333', color: 'whitesmoke' }}>
					<div className="side-bar-item">Settings</div>
				</AccordionSummary>
				<AccordionDetails style={{ backgroundColor: '#333' }}>
					<div className="side-bar-item" style={{ backgroundColor: '#333' }}>
						<div className="side-bar-item">
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
								{!isJsonLogTab() &&
									<>
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
									</>
								}
							</div>
						</div>
					</div>
				</AccordionDetails>
			</Accordion >
		</>
	);
});

export default SideBarSettings;