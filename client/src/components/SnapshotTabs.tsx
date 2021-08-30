import { Tab, Tabs } from '@material-ui/core'
import MessageQueueStore, { ACTIVE_SNAPSHOT_NAME } from '../store/MessageQueueStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { TabContext, TabPanel } from '@material-ui/lab';
import SnapshotTabContent from './SnapshotTabContent';

type Props = {
	store: MessageQueueStore,
};
const SnapshotTabs = observer(({ store }: Props) => {
	const [tabValue, setTabValue] = React.useState(store.getSelectedSnapshotName());

	function handleTabChange(e: React.ChangeEvent<{}>, value: string) {
		// console.log('handleTabChange', value);
		setTabValue(value);
		store.setSelectedSnapshotName(value);
	}

	function handleTakeSnapshot(value: string) {
		// console.log('handleTakeSnapshot', value);
		const name = store.newSnapshot();
	}

	function handleDeleteTab(event: any, value: string) {
		// console.log('handleDeleteSnapshot', value);
;		event.stopPropagation();
		if (tabValue === value) {
			setTabValue(ACTIVE_SNAPSHOT_NAME);
			store.setSelectedSnapshotName(ACTIVE_SNAPSHOT_NAME);
		}
		store.deleteSnapshot(value);
	}

	return (
		<div className="snapshot__container">
			<TabContext value={tabValue}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					indicatorColor="primary"
					textColor="primary"
					aria-label="Snapshots">
					{store.getSnapshotNames().map((value, i) => (
						<Tab
							value={ value }
							label={
								<div className={'snapshot__tab'}>
									<div>{(i === 0
										? store.getStopped() ? 'Stopped' : 'Recording'
										: 'SNAPSHOT') + ' ('+store.getSnapshotSize(value)+')'}</div>
									{value === ACTIVE_SNAPSHOT_NAME
										? <div className={ 'snapshot__folder-plus fa fa-folder-plus' }
											style={{
												pointerEvents: store.getSnapshotSize(value) === 0 ? 'none' : undefined,
												opacity: store.getSnapshotSize(value) === 0 ? .2 : undefined,
											}}
											title="Take snapshot"
											onClick={() => handleTakeSnapshot(value)}
											/>
										: <div className={ 'snapshot__close fa fa-times' }
											title="Delete snapshot"
											onClick={(e) => handleDeleteTab(e, value)}
											/>
									}
								</div>
							}>
						</Tab>
					))}
				</Tabs>
				{store.getSnapshotNames().map(value => (
					<TabPanel value={value}>
						<SnapshotTabContent messageQueueStore={ store }/>
					</TabPanel>
				))}
			</TabContext>
		</div>
	);
});

export default SnapshotTabs;