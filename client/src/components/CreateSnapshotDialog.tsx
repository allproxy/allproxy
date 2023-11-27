import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	onClose: (snapshotName: string) => void,
};
const CreateSnapshotNameDialog = observer(({ open, onClose }: Props) => {
	const [snapshotName, setSnapshotName] = React.useState('');

	const handleClose = () => {
		onClose(snapshotName);
	};

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">Tab Name</DialogTitle>
			<input className={'export__input-file-name form-control'} value={snapshotName} onChange={(value) => setSnapshotName(value.target.value)} />
			<button className={'btn btn-success'}
				disabled={snapshotName.length === 0}
				onClick={() => onClose(snapshotName)}
			>
				Create
			</button>
		</Dialog>
	);
});

export default CreateSnapshotNameDialog;