import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	heading: string,
	buttonLabel: string,
	onClose: (fileName: string) => void,
};
const ExportDialog = observer(({ open, heading: title, buttonLabel, onClose }: Props) => {
	const [fileName, setFileName] = React.useState('');

	const handleClose = () => {
		onClose(fileName);
	};

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} maxWidth={'lg'}>
			<DialogTitle id="simple-dialog-title">{title}</DialogTitle>
			<DialogContent>
				<input autoFocus className={'export__input-file-name form-control'} value={fileName} onChange={(value) => setFileName(value.target.value)} />
				<button className={'btn btn-success'}
					disabled={fileName.length === 0}
					onClick={() => onClose(fileName)}
				>
					{buttonLabel}
				</button>
			</DialogContent>
		</Dialog>
	);
});

export default ExportDialog;