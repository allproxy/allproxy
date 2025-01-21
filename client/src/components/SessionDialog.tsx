import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@material-ui/core';
import GTag from '../GTag';
import { sessionStore } from '../store/SessionStore';

type Props = {
	open: boolean,
	title: 'Enter Session Name' | 'Move Session',
	onClose: (fileName: string, category: string) => void,
};
const SessionDialog = observer(({ open, title, onClose }: Props) => {
	const [fileName, setFileName] = React.useState('');
	const [category, setCategory] = React.useState('default');
	const [newCategory, setNewCategory] = React.useState('');

	const handleClose = () => {
		onClose(fileName, category);
		GTag.pageView('SessionDialog');
	};

	const handleRadioChange = (e: any) => {
		setCategory(e.target.value as string);
	};

	return (
		<Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open} maxWidth={'lg'}>
			<DialogTitle id="simple-dialog-title">{title}</DialogTitle>
			<DialogContent>
				{title === 'Enter Session Name' &&
					<input autoFocus className={'export__input-file-name form-control'}
						value={fileName}
						onChange={(e) => setFileName(e.target.value)} />
				}
				<div style={{ marginLeft: '1rem' }}>
					<FormControl style={{ padding: '1rem' }}>
						<FormLabel id="theme-radio-button">Tab Name:</FormLabel>
						<RadioGroup
							aria-labelledby="category-radio-button"
							defaultValue={category}
							name="radio-buttons-group"
						>
							{sessionStore.getCategories().map(value =>
								<FormControlLabel value={value} control={<Radio />} label={value} onClick={handleRadioChange} />
							)}
						</RadioGroup>
					</FormControl>
					<div>
						<button className={'btn btn-primary btn-sm'}
							style={{ height: '30px' }}
							disabled={newCategory.length === 0}
							onClick={() => {
								if (!sessionStore.getCategories().includes(newCategory)) {
									sessionStore.getCategories().push(newCategory);
								}
								setNewCategory('');
							}}
						>
							Add
						</button>
						<input type="text"
							value={newCategory} style={{ color: 'black' }}
							placeholder="New tab name"
							onChange={(e) => {
								setNewCategory(e.target.value);
							}} />
					</div>
				</div>
				<hr />
				<button className={'btn btn-success'}
					disabled={fileName.length === 0 && title === 'Enter Session Name'}
					onClick={() => onClose(fileName, category)}
				>
					{title === 'Enter Session Name' ? 'Save' : 'Move'}
				</button>
			</DialogContent>
		</Dialog>
	);
});

export default SessionDialog;