import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle } from '@material-ui/core';
import React from 'react';
import { createNewSubset, subsetFieldName, timeFieldName } from '../store/FileSubsetStore';
import { mainTabStore } from '../store/MainTabStore';

type Props = {
	open: boolean,
	fileName: string,
	onClose: (result: { filterValue: string, fileSize: number, startTime: string, endTime: string } | undefined) => void,
};
const NewSubsetDialog = observer(({ open, onClose, fileName }: Props) => {
	const [filterValues, setFilterValue] = React.useState('');

	async function handleCreateSubnet() {
		const filters: string[] = [];
		for (const v of filterValues.split(' ')) {
			filters.push(`"${subsetFieldName}":"${v}`);
		}
		mainTabStore.setUpdating(true, `Finding lines matching '` + filters.join('|')) + `'`;
		const { fileSize, startTime, endTime } = await createNewSubset(fileName, filterValues.split(' '), timeFieldName);
		mainTabStore.setUpdating(false);
		if (fileSize === 0) {
			alert(`No lines match ${filters.join('|')} in file ${fileName}`);
		} else {
			onClose({ filterValue: filterValues, fileSize, startTime, endTime });
		}
	}

	return (
		<Dialog onClose={undefined} aria-labelledby="simple-dialog-title" open={open} fullWidth={true} maxWidth={'md'}>
			<DialogTitle id="simple-dialog-title">New Sorted Subset</DialogTitle>
			<div style={{ padding: '1rem' }}>

				<div className="primary-text-color" style={{}}>
					App or component filter used to subset the large log file.   Specify one or more space separated filters.
				</div>
				<div style={{ display: 'flex' }}>
					<input className="form-control"
						placeholder={"Enter the " + subsetFieldName + ' name (e.g., regional-dnlb fabcon'}
						value={filterValues}
						onChange={(e) => setFilterValue(e.target.value)}
					/>
				</div>
				<hr></hr>
				<div style={{ display: 'flex', float: 'right' }}>
					<button className={'btn btn-sm btn-secondary'}
						onClick={() => onClose(undefined)}
					>
						Cancel
					</button>
					<div style={{ width: '.5rem' }}></div>
					<button className={'btn btn-sm btn-success'}
						disabled={filterValues === "" || mainTabStore.isUpdating()}
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
