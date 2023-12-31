import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	onClose: (doDelete: boolean) => void,
};
const DeleteDialog = observer(({ open, onClose }: Props) => {

	return (
		<Dialog onClose={() => onClose(false)} aria-labelledby="simple-dialog-title" open={open} maxWidth={'sm'}>
			<DialogTitle id="simple-dialog-title">Delete?</DialogTitle>
			<button className={'btn btn-sm btn-secondary'}
				onClick={() => onClose(false)}
			>
				Cancel
			</button>
			<button className={'btn btn-sm btn-danger'}
				onClick={() => onClose(true)}
			>
				Delete
			</button>
		</Dialog>
	);
});

export default DeleteDialog;