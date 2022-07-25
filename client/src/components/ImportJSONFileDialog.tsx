import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,
	onClose: (primaryJSONFields: string[]) => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [primaryJSONFields, setPrimaryJSONFields] = React.useState<string[]>([]);

	const handleClose = () => {
		onClose(primaryJSONFields);
	}

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">Enter Primary JSON Field Names (optional)</DialogTitle>
			<input className={'form-control'}
				style={{
					marginLeft: '1rem',
					marginRight: '1rem',
					marginBottom: '1rem',
					width: '500px'
				}}
				value={primaryJSONFields}
				onChange={(value) => setPrimaryJSONFields(value.target.value.split(','))}
				placeholder="Comma separated list"
			/>
			<button className={'btn btn-success'}
				onClick={() => onClose(primaryJSONFields)}
			>
				Select JSON File
			</button>
		</Dialog>
	);
});

export default ImportJSONFileDialog;