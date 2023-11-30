import { Tab, Tabs } from '@material-ui/core';
import MessageQueueStore from '../store/MessageQueueStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { TabContext, TabPanel } from '@material-ui/lab';
import MainTabContent from './MainTabContent';
import MainTabStore, { PROXY_TAB_NAME } from '../store/MainTabStore';
import CreateTabNameDialog from './CreateTabDialog';
import { urlPathStore } from '../store/UrlPathStore';
import LayoutStore from '../store/LayoutStore';

type Props = {
	messageQueueStore: MessageQueueStore,
	mainTabStore: MainTabStore,
};
const MainTabs = observer(({ messageQueueStore, mainTabStore }: Props) => {
	const [openCreateTapDialog, setOpenCreateTabDialog] = React.useState(false);

	function handleTabChange(_e: React.ChangeEvent<{}>, value: string) {
		// console.log('handleTabChange', value);
		mainTabStore.setSelectedTabName(value);
		for (const messageStore of mainTabStore.getSelectedMessages()) {
			messageStore.setFiltered(undefined);
		}
	}

	function handleCopyProxyTab(_value: string) {
		messageQueueStore.setFreeze(false);
		setOpenCreateTabDialog(true);
	}

	function handleDeleteTab(event: any, value: string) {
		; event.stopPropagation();
		if (mainTabStore.getSelectedTabName() === value) {
			mainTabStore.setSelectedTabName(PROXY_TAB_NAME);
		}
		mainTabStore.deleteTab(value);
		if (urlPathStore.isLogViewer()) {
			const names = mainTabStore.getTabNames();
			if (names.length > 1) {
				mainTabStore.setSelectedTabName(names[1]);
			}
		}
	}

	function title(value: string, i: number) {
		return (i === 0
			? 'Proxy'
			: mainTabStore.getTabName(value)) + ' (' + mainTabStore.getTabMessageCount(value) + ')';
	}

	const dim = new LayoutStore().requestContainer(true);
	return (
		<div className="maintab__container">
			{mainTabStore.getTabNames().length === 1 && urlPathStore.isLogViewer()
				?
				<div style={{ height: dim.height, width: dim.width }}>
					<div className="center">
						Click the <b>Import</b> or <b>Restore Session</b> button
					</div>
				</div>
				:
				<TabContext value={mainTabStore.getSelectedTabName()}>
					<Tabs
						value={mainTabStore.getSelectedTabName()}
						onChange={handleTabChange}
						indicatorColor="primary"
						textColor="primary"
						aria-label="MainTabs">
						{mainTabStore.getTabNames().map((value, i) => (
							(i > 0 || !urlPathStore.isLogViewer()) &&
							<Tab
								key={value}
								value={value}
								label={
									<div className={'maintab__tab'} title={title(value, i)}>
										<div className="maintab__tab-name">
											{title(value, i)}
										</div>
										{value === PROXY_TAB_NAME
											? <div className={'maintab__folder-plus fa fa-arrow-right'}
												style={{
													marginLeft: '.5rem',
													pointerEvents: mainTabStore.getTabMessageCount(value) === 0 ? 'none' : undefined,
													opacity: mainTabStore.getTabMessageCount(value) === 0 ? .2 : undefined,
												}}
												title="Copy to new tab"
												onClick={() => handleCopyProxyTab(value)}
											/>
											: <div className={'maintab__close fa fa-times'}
												style={{ marginLeft: '.5rem' }}
												title="Delete tab"
												onClick={(e) => handleDeleteTab(e, value)}
											/>
										}
									</div>
								}>
							</Tab>
						))}
					</Tabs>
					{mainTabStore.getTabNames().map((value, i) => (
						(i > 0 || !urlPathStore.isLogViewer()) &&
						<TabPanel
							key={value}
							value={value}>
							<MainTabContent
								messageQueueStore={messageQueueStore}
								selectedReqSeqNum={mainTabStore.getSelectedReqSeqNumbers()[i]}
								setSelectedReqSeqNum={
									(num) => mainTabStore.getSelectedReqSeqNumbers()[i] = num
								}
								scrollTop={mainTabStore.getScrollTop()[i]}
								setScrollTop={
									(scrollTop) => mainTabStore.getScrollTop()[i] = scrollTop
								}
								renderSetTopIndex={mainTabStore.getRenderSetTopIndex()[i]}
								setRenderSetTopIndex={
									(scrollTop) => mainTabStore.getRenderSetTopIndex()[i] = scrollTop
								}
								highlightSeqNum={mainTabStore.getHightlightSeqNum()[i]}
								setHighlightSeqNum={
									(seqNum) => mainTabStore.getHightlightSeqNum()[i] = seqNum
								}
							/>
						</TabPanel>
					))}
				</TabContext>
			}
			<CreateTabNameDialog
				open={openCreateTapDialog}
				onClose={(tabName) => {
					setOpenCreateTabDialog(false);
					if (tabName.length > 0) {
						mainTabStore.newTab(tabName);
					}
				}}
			/>
		</div>
	);
});

export default MainTabs;