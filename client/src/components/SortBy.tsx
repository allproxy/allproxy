import { TableSortLabel } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { messageQueueStore } from '../store/MessageQueueStore';

const fields = [
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
]

const SortBy = observer((): JSX.Element => {
	return (
		<>
			<div className="side-bar-item">Sort By:</div>
			{
				fields.map(field => (
					<div className="side-bar-item">
						<button className={"btn btn-xs " + (messageQueueStore.getSortByField() === field.name ? "btn-primary" : "btn-secondary")}
							style={{ width: "calc(128px - 2rem)", marginLeft: ".5rem", textAlign: "left" }}
							key={field.name}
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
		</>
	)
});

export function sortOrderHandler(fieldName: string) {
	if (messageQueueStore.getSortByField && messageQueueStore.getSortByField() !== fieldName) {
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

export default SortBy;