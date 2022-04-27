import { Tab, Tabs } from '@material-ui/core'
import MessageQueueStore from '../store/MessageQueueStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { TabContext, TabPanel } from '@material-ui/lab';
import SnapshotTabContent from './SnapshotTabContent';
import SnapshotStore, { ACTIVE_SNAPSHOT_NAME } from '../store/SnapshotStore';

type Props = {
	messageQueueStore: MessageQueueStore,
	snapshotStore: SnapshotStore,
};
const SnapshotTabs = observer(({ messageQueueStore, snapshotStore }: Props) => {

	function handleTabChange(_e: React.ChangeEvent<{}>, value: string) {
		// console.log('handleTabChange', value);
		snapshotStore.setSelectedSnapshotName(value);
	}

	function handleTakeSnapshot(_value: string) {
		// console.log('handleTakeSnapshot', value);
		messageQueueStore.setFreeze(false);
		snapshotStore.newSnapshot();
	}

	function handleDeleteTab(event: any, value: string) {
		// console.log('handleDeleteSnapshot', value);
;		event.stopPropagation();
		if (snapshotStore.getSelectedSnapshotName() === value) {
			snapshotStore.setSelectedSnapshotName(ACTIVE_SNAPSHOT_NAME);
		}
		snapshotStore.deleteSnapshot(value);
	}

	return (
		<div className="snapshot__container">
			<TabContext value={snapshotStore.getSelectedSnapshotName()}>
				<Tabs
					value={snapshotStore.getSelectedSnapshotName()}
					onChange={handleTabChange}
					indicatorColor="primary"
					textColor="primary"
					aria-label="Snapshots">
					{snapshotStore.getSnapshotNames().map((value, i) => (
						<Tab
							value={ value }
							label={
								<div className={'snapshot__tab'}>
									<div>{(i === 0
										? messageQueueStore.getStopped() ? 'Stopped' : 'Recording'
										: snapshotStore.getSnapshotName(value)) + ' ('+snapshotStore.getSnapshotSize(value)+')'}</div>
									{value === ACTIVE_SNAPSHOT_NAME
										? <div className={ 'snapshot__folder-plus fa fa-camera' }
											style={{
												marginLeft: '.5rem',
												pointerEvents: snapshotStore.getSnapshotSize(value) === 0 ? 'none' : undefined,
												opacity: snapshotStore.getSnapshotSize(value) === 0 ? .2 : undefined,
											}}
											title="Take snapshot"
											onClick={() => handleTakeSnapshot(value)}
											/>
										: <div className={ 'snapshot__close fa fa-times' }
											style={{marginLeft: '.5rem'}}
											title="Delete snapshot"
											onClick={(e) => handleDeleteTab(e, value)}
											/>
									}
								</div>
							}>
						</Tab>
					))}
				</Tabs>
				{snapshotStore.getSnapshotNames().map((value, i) => (
					<TabPanel value={value}>
						<SnapshotTabContent
							messageQueueStore={ messageQueueStore }
							selectedReqSeqNum={snapshotStore.getSelectedReqSeqNumbers()[i]}
							setSelectedReqSeqNum={
								(num) => snapshotStore.getSelectedReqSeqNumbers()[i] = num
							}
							scrollTop={snapshotStore.getScrollTop()[i]}
							setScrollTop={
								(scrollTop) => snapshotStore.getScrollTop()[i] = scrollTop
							}
					/>
					</TabPanel>
				))}
			</TabContext>
		</div>
	);
});

export default SnapshotTabs;