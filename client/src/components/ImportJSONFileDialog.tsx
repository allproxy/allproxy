import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle } from '@material-ui/core';
import { snapshotStore } from '../store/SnapshotStore';
import { importJSONFile } from '../ImportJSONFile';
import pako from 'pako';

type Props = {
	open: boolean,
	onClose: () => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [pastedJSON, setPastedJSON] = React.useState<string>("");
	const [fileContent, setFileContent] = React.useState<string>("");
	const [tabName, setTabName] = React.useState<string>("");
	const [submit, setSubmit] = React.useState(false);

	var input = document.createElement('input');
	input.type = 'file';

	let fileName: string;

	input.onchange = (e: any) => {
		let file = e.target.files[0];

		// setting up the reader
		const reader = new FileReader();

		fileName = file.name;
		const isGzip = file.type.indexOf('gzip') !== -1;
		if (isGzip) {
			reader.readAsArrayBuffer(file);
		} else {
			reader.readAsText(file, 'UTF-8');
		}

		let content;
		// here we tell the reader what to do when it's done reading...
		reader.onload = (readerEvent: any) => {
			content = readerEvent.target.result; // this is the content!

			if (isGzip) {
				setFileContent(pako.ungzip(content, { to: 'string' }));
			} else {
				setFileContent(content);
			}
		};
	};

	if (submit) {
		snapshotStore.setUpdating(true);
		setSubmit(false);
		onClose();
		setTimeout(() => {
			if (!!fileContent.length) {
				snapshotStore.importSnapshot(tabName, importJSONFile(fileName, fileContent, []));
				setFileContent('');
			} else if (pastedJSON.length > 0) {
				const flatten = function (json: object) {
					let line = JSON.stringify(json);
					line = line.replace(/\\n/g, '');
					line = line.replace(/\\r/g, '');
					line = line.replace(/\\"/g, '');
					return line;
				};

				let jsonLines = pastedJSON;
				try {
					const json = JSON.parse(pastedJSON);
					jsonLines = flatten(json);
					for (const field in json) {
						const value = json[field];
						if (Array.isArray(value)) {
							for (const obj of value) {
								if (typeof value === 'object') {
									jsonLines += "\n" + flatten(obj);
								}
							}
						}
					}
				} catch (e) {
					console.log(e);
				}
				snapshotStore.importSnapshot(tabName, importJSONFile(tabName, jsonLines, []));
				setPastedJSON('');
			}
			setTabName('');
			snapshotStore.setUpdating(false);
		}, 1000);
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

				<div className="primary-text-color">Import File or Paste Text:</div>
				<div style={{ display: "flex", alignItems: "center", margin: ".5rem 0 1rem 0" }}>
					<button className={'btn btn-primary btn-lg'} style={{ whiteSpace: 'nowrap' }}
						onClick={() => input.click()}
					>
						Import File
					</button>
					<div style={{ width: "1rem" }}></div>
					<textarea
						className="form-control"
						style={{ width: "100vw", height: "calc(3 * 48px)", textAlign: "center" }}
						placeholder="Paste Text Here"
						value={pastedJSON}
						onChange={(value) => { setPastedJSON(value.target.value); }}
					/>
				</div>
				<button className={'btn btn-success'} style={{ float: "right" }}
					disabled={tabName.length === 0 || (fileContent.length === 0 && pastedJSON.length === 0)}
					onClick={() => setSubmit(true)}
				>
					Submit
				</button>
			</div>
		</Dialog >
	);
});

export default ImportJSONFileDialog;