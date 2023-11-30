import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	onClose: (tabName: string) => void,
};
const CreateTabNameDialog = observer(({ open, onClose }: Props) => {
	const [tabName, setTabName] = React.useState('');

	const handleClose = () => {
		onClose(tabName);
	};

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">Tab Name</DialogTitle>
			<input className={'export__input-file-name form-control'} value={tabName} onChange={(value) => setTabName(value.target.value)} />
			<button className={'btn btn-success'}
				disabled={tabName.length === 0}
				onClick={() => onClose(tabName)}
			>
				Create
			</button>
		</Dialog>
	);
});

export default CreateTabNameDialog;