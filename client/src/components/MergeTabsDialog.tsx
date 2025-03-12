import { observer } from 'mobx-react-lite';
import React from 'react';
import { Checkbox, Dialog, DialogContent, DialogTitle, MenuItem } from '@material-ui/core';
import GTag from '../GTag';
import { mainTabStore } from '../store/MainTabStore';
import Message from '../common/Message';

type Props = {
	open: boolean,
	onClose: () => void,
};
const SessionDialog = observer(({ open, onClose }: Props) => {
	const [tabName, setTabName] = React.useState('');
	const [tabChecked, setTabChecked] = React.useState<boolean[]>(new Array(mainTabStore.getTabNames().length));

	const handleMerge = () => {
		mainTabStore.setUpdating(true, 'Merging tabs...');
		const messages: Message[] = [];
		for (let i = 0; i < tabChecked.length; ++i) {
			if (tabChecked[i]) {
				const tabName = mainTabStore.getTabNames()[i];
				const messageStores = mainTabStore.getTabs().get(tabName);
				for (const messageStore of messageStores) {
					messages.push(messageStore.getMessage());
				}
			}
		}
		mainTabStore.importTab(tabName, messages, 'sort');
		mainTabStore.setUpdating(false);

		onClose();
		GTag.pageView('MergeTabsDialog');
	};

	const handleCheck = (i: number) => {
		const t = tabChecked.slice();
		if (t[i]) t[i] = false;
		else t[i] = true;
		setTabChecked(t);
	};

	const isReadyToSubmit = () => {
		let tabsCheckedCount = 0;
		for (let i = 0; i < tabChecked.length; ++i) {
			if (tabChecked[i]) ++tabsCheckedCount;
		}
		return tabName.length > 0 && tabsCheckedCount >= 2;
	};

	return (
		<Dialog onClose={onClose} aria-labelledby="simple-dialog-title" open={open} maxWidth={'lg'}>
			<DialogTitle id="simple-dialog-title">Merge Tabs</DialogTitle>
			<DialogContent>
				<div style={{ marginLeft: '1rem', minWidth: '50vw' }}>
					<div style={{ display: 'flex' }}>
						<div className="primary-text-color" style={{ whiteSpace: 'nowrap', lineHeight: '48px', marginRight: '.5rem' }}>New Tab Name:</div>
						<input
							autoFocus
							style={{ height: "48px", marginBottom: "1rem" }}
							className="form-control"
							value={tabName}
							onChange={(value) => setTabName(value.target.value)} />
					</div>
					<div className="primary-text-color" >Check tabs to merge:</div>
					{mainTabStore.getTabNames().map((value, i) => (
						i > 0 && (
							<MenuItem key={value}>
								<Checkbox style={{ paddingTop: 0, paddingBottom: 0 }}
									size={"small"}
									defaultChecked={false}
									value={tabChecked[i]}
									onChange={() => handleCheck(i)} />
								{mainTabStore.getTabName(value) + ' (' + mainTabStore.getTabMessageCount(value) + ')'}
							</MenuItem>
						)
					))}
				</div>
				<hr />
				<button className={'btn btn-success'}
					disabled={!isReadyToSubmit()}
					onClick={handleMerge}
				>
					Merge
				</button>
			</DialogContent>
		</Dialog >
	);
});

export default SessionDialog;