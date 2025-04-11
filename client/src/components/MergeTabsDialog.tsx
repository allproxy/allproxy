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
	const [tabChecked, setTabChecked] = React.useState<{ [key: string]: number }>({});

	const handleMerge = () => {
		mainTabStore.setUpdating(true, 'Merging tabs...');
		const messages: Message[] = [];
		for (const key in tabChecked) {
			const i = tabChecked[key];
			const tabName = mainTabStore.getTabNames()[i];
			const messageStores = mainTabStore.getTabs().get(tabName);
			for (const messageStore of messageStores) {
				messages.push(messageStore.getMessage());
			}
		}
		mainTabStore.importTab(tabName, messages, 'sort');
		mainTabStore.setUpdating(false);

		handleClose();
		GTag.pageView('MergeTabsDialog');
	};

	const handleClose = () => {
		setTabName('');
		setTabChecked({});
		onClose();
	};

	const handleCheck = (tabName: string, i: number) => {
		if (tabChecked[tabName] === undefined) {
			tabChecked[tabName] = i;
		} else {
			delete tabChecked[tabName];
		}
		setTabChecked(tabChecked);
	};

	const isReadyToSubmit = () => {
		return tabName !== '' && Object.keys(tabChecked).length >= 2;
	};

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} maxWidth={'lg'}>
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
									onChange={() => handleCheck(mainTabStore.getTabNames()[i], i)} />
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