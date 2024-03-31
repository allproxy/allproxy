import { Accordion, AccordionDetails, AccordionSummary, TableSortLabel } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { messageQueueStore } from '../store/MessageQueueStore';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { filterStore } from '../store/FilterStore';
import { isJsonLogTab } from './SideBar';

const httpFields = [
	{
		name: 'timestamp',
		displayName: 'Time'
	},
	{
		name: 'elapsedTime',
		displayName: 'Rsp Time'
	},
	{
		name: 'serverHost',
		displayName: 'Server'
	},
	{
		name: 'status',
		displayName: 'Status'
	},
	{
		name: 'method',
		displayName: 'Method'
	},
	{
		name: 'url',
		displayName: 'URL'
	},
];

const logFields = [
	{
		name: 'date',
		displayName: 'Date'
	},
	{
		name: 'level',
		displayName: 'Level'
	},
	{
		name: 'category',
		displayName: 'Category'
	},
	{
		name: 'appName',
		displayName: 'App Name'
	},
	{
		name: 'message',
		displayName: 'Message'
	},
];

const SideBarSortBy = observer((): JSX.Element => {
	const fields = isJsonLogTab() ? logFields.slice() : httpFields.slice();
	for (const key of filterStore.getSortByKeys()) {
		fields.unshift({
			name: key as string,
			displayName: key as string
		});
	}
	if (messageQueueStore.getSortByField() !== undefined) {
		let found = false;
		for (const field of fields) {
			if (field.name === messageQueueStore.getSortByField()) {
				found = true;
			}
		}
		if (!found) messageQueueStore.setSortByField(undefined);
	}
	return (
		<>
			<hr className="side-bar-divider"></hr>
			< Accordion >
				<AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'whitesmoke' }} />} style={{ backgroundColor: '#333', color: 'whitesmoke' }}>
					<div className="side-bar-item">Sort By</div>
				</AccordionSummary>
				<AccordionDetails style={{ backgroundColor: '#333' }}>
					<div style={{ backgroundColor: '#333' }}>
						{
							fields.map(field => (
								<div className="side-bar-item">
									<button className={"btn btn-xs " + (messageQueueStore.getSortByField() === field.name ? "btn-warning" : "btn-secondary")}
										style={{ width: "7rem", marginLeft: "1rem", textAlign: "left" }}
										key={field.displayName}
										onClick={() => sortOrderHandler(field.name)}
									>
										<TableSortLabel active={messageQueueStore.getSortByField() === field.name}
											direction={messageQueueStore.getSortOrder()}
										>
											{field.displayName}
										</TableSortLabel>
									</button>
								</div>
							))
						}
					</div>
				</AccordionDetails>
			</Accordion>
		</>
	);
});

export function sortOrderHandler(fieldName: string) {
	if (messageQueueStore.getSortByField() && messageQueueStore.getSortByField() !== fieldName) {
		messageQueueStore.setSortByField(undefined);
		messageQueueStore.setSortOrder('asc');
	}

	if (messageQueueStore.getSortByField()) {
		if (messageQueueStore.getSortOrder() === 'asc') {
			messageQueueStore.setSortOrder('desc');
		} else {
			messageQueueStore.setSortOrder('asc');
			messageQueueStore.setSortByField(undefined);
		}
	} else {
		messageQueueStore.setSortByField(fieldName);
	}
	messageQueueStore.sortOrderChanged();
}

export default SideBarSortBy;