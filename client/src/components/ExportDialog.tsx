import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	onClose: (fileName: string) => void,
};
const ExportDialog = observer(({ open, onClose }: Props) => {
	const [fileName, setFileName] = React.useState('');

	const handleClose = () => {
		onClose(fileName);
	}

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      		<DialogTitle id="simple-dialog-title">Enter Snapshot Name</DialogTitle>
			<input className={'export__input-file-name form-control'} value={fileName} onChange={(value) => setFileName(value.target.value)}/>
			<button className={'btn btn-success'}
				disabled={fileName.length === 0}
				onClick={() => onClose(fileName)}
			>
				Export
			</button>
		</Dialog>
	);
});

export default ExportDialog;