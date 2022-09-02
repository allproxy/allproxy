import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';
import { useFilePicker } from 'use-file-picker';
import { snapshotStore } from '../store/SnapshotStore';
import { importJSONFile } from '../ImportJSONFile';
import JSONFields from './JSONFields';

type Props = {
	open: boolean,
	onClose: () => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [primaryJSONFields] = React.useState<string[]>([]);
	const [pastedJSON, setPastedJSON] = React.useState<string>("");
	const [tabName, setTabName] = React.useState<string>("");
	const [submit, setSubmit] = React.useState(false);

	const [openJSONFileSelector, { filesContent: jsonContent, clear: jsonClear }] = useFilePicker({
		multiple: false
	});

	if (submit) {
		if (!!jsonContent.length) {
			for (const fileContent of jsonContent) {
				console.log(fileContent.content);
				snapshotStore.importSnapshot(tabName, importJSONFile(fileContent.name, fileContent.content, primaryJSONFields), JSONFields);
			}
			jsonClear();
		}

		if (pastedJSON.length > 0) {
			snapshotStore.importSnapshot(tabName, importJSONFile(tabName, pastedJSON, primaryJSONFields), JSONFields);
			setPastedJSON('');
		}
		setTabName('');
		setSubmit(false);
		onClose();
	}

	return (
		<Dialog onClose={onClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">Import JSON Log</DialogTitle>
			<div style={{ padding: " 0 1rem 1rem 1rem" }}>
				<div className="primary-text-color">Tab Name:</div>
				<input
					style={{ height: "48px", marginBottom: "1rem" }}
					className="form-control"
					placeholder="Tab Name"
					value={tabName}
					onChange={(value) => setTabName(value.target.value)}
				/>

				{/* <div className="primary-text-color">Primary JSON Field Names:</div>
				<input className={'form-control'}
					style={{
						marginBottom: "1rem",
						width: '500px',
						height: '48px'
					}}
					value={primaryJSONFields}
					onChange={(value) => setPrimaryJSONFields(value.target.value.split(','))}
					placeholder="Comma Separated List"
				/> */}

				<div className="primary-text-color">Read File or Paste Text:</div>
				<div style={{ display: "flex", alignItems: "center", margin: ".5rem 0 1rem 0" }}>
					<button className={'btn btn-primary btn-lg'} style={{ width: "50%" }}
						onClick={() => { openJSONFileSelector(); }}
					>
						Read File
					</button>
					<div style={{ width: "1rem" }}></div>
					<textarea
						className="form-control"
						style={{ width: "50%", height: "48px", textAlign: "center" }}
						placeholder="Paste Text Here"
						value={pastedJSON}
						onChange={(value) => { setPastedJSON(value.target.value); }}
					/>
				</div>
				<button className={'btn btn-success'} style={{ float: "right" }}
					disabled={tabName.length === 0 || (jsonContent.length === 0 && pastedJSON.length === 0)}
					onClick={() => setSubmit(true)}
				>
					Submit
				</button>
			</div>
		</Dialog >
	);
});

export default ImportJSONFileDialog;