import { observer } from 'mobx-react-lite';
import { Checkbox, Dialog, DialogTitle, ListItemText, MenuItem, Select } from '@material-ui/core';
import React from 'react';
import { createNewSubset, subsetFieldName, timeFieldName } from '../store/FileSubsetStore';
import { mainTabStore } from '../store/MainTabStore';

type Props = {
	open: boolean,
	fileName: string,
	selectableSubsets: string[],
	onClose: (result: { filterValue: string, fileSize: number, startTime: string, endTime: string } | undefined) => void,
};
const NewSubsetDialog = observer(({ open, onClose, fileName, selectableSubsets }: Props) => {
	const [selectedSubsets, setSelectedSubsets] = React.useState<string[]>([]);

	async function handleCreateSubnet() {
		const filters: string[] = [];
		for (const v of selectedSubsets) {
			filters.push(`"${subsetFieldName}":"${v}`);
		}
		mainTabStore.setUpdating(true, `Finding lines matching '` + filters.join('|')) + `'`;
		const { fileSize, startTime, endTime } = await createNewSubset(fileName, selectedSubsets, timeFieldName);
		mainTabStore.setUpdating(false);
		if (fileSize === 0) {
			alert(`No lines match ${filters.join('|')} in file ${fileName}`);
		} else {
			onClose({ filterValue: selectedSubsets.join(' '), fileSize, startTime, endTime });
		}
		setSelectedSubsets([]);
	}

	function cancel() {
		setSelectedSubsets([]);
		onClose(undefined);
	}

	const handleChange = (subset: string) => {
		const i = selectedSubsets.indexOf(subset);
		if (i !== -1) {
			const s = [...selectedSubsets];
			s.splice(i, 1);
			setSelectedSubsets(s);
		} else {
			setSelectedSubsets([
				...selectedSubsets,
				subset
			]);
		}
	};

	return (
		<Dialog onClose={cancel} aria-labelledby="simple-dialog-title" open={open} fullWidth={true} maxWidth={'md'}>
			<DialogTitle id="simple-dialog-title">New Sorted Subset</DialogTitle>
			<div style={{ padding: '1rem' }}>

				<div className="primary-text-color" style={{}}>
					Select one or more components (app).
				</div>
				<div>
					<Select
						multiple
						value={selectableSubsets}
						renderValue={() => selectedSubsets.length > 0 ? selectedSubsets.join(' ') : "App/Component"}>
						{selectableSubsets.map((subset) => (
							<MenuItem key={subset} value={subset}>
								<Checkbox
									checked={selectedSubsets.includes(subset)}
									onChange={() => handleChange(subset)} />
								<ListItemText primary={subset} />
							</MenuItem>
						))}
					</Select>
				</div>
				<hr></hr>
				<div style={{ display: 'flex', float: 'right' }}>
					<button className={'btn btn-sm btn-secondary'}
						onClick={cancel}
					>
						Cancel
					</button>
					<div style={{ width: '.5rem' }}></div>
					<button className={'btn btn-sm btn-success'}
						disabled={selectedSubsets.length === 0 || mainTabStore.isUpdating()}
						onClick={handleCreateSubnet}
					>
						Create
					</button>
				</div>
			</div >
		</Dialog >
	);
});

export default NewSubsetDialog;
