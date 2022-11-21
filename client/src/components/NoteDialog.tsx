import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';
import MessageStore from '../store/MessageStore';

type Props = {
	open: boolean,
	message: MessageStore,
	onClose: () => void,
};
const NoteDialog = observer(({ open, message, onClose }: Props) => {
	const [note, setNote] = React.useState('');

	const handleClose = () => {
		message.setNote(note);
		onClose();
	}

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} maxWidth={'lg'}>
			<DialogTitle id="simple-dialog-title">Note</DialogTitle>
			<input className={'export__input-file-name form-control'}
				value={note}
				onChange={(value) => setNote(value.target.value)} />
			<button className={'btn btn-success'}
				disabled={note.length === 0}
				onClick={handleClose}
			>
				Add
			</button>
		</Dialog>
	);
});

export default NoteDialog;