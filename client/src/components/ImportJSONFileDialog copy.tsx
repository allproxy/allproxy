import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle, ListItemText, MenuItem, Select } from '@material-ui/core';
import { mainTabStore } from '../store/MainTabStore';
import { importJSONFile } from '../ImportJSONFile';
import FileReaderStore, { maxLinesPerTab } from '../store/FileReaderStore';

type Props = {
	open: boolean,
	onClose: () => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [pastedJSON, setPastedJSON] = React.useState<string>("");
	const [tabName, setTabName] = React.useState<string>("");
	const [selectedFile, setSelectedFile] = React.useState<any>(undefined);
	const [submit, setSubmit] = React.useState(false);
	const [fileReaderStore, setFileReadStore] = React.useState(new FileReaderStore());
	const [maxLines, setMaxLines] = React.useState<number>(maxLinesPerTab);
	const [startTime, setStartTime] = React.useState<string>("");
	const [endTime, setEndTime] = React.useState<string>("");
	const [includeFilter, setIncludeFilter] = React.useState<string>("");
	const [excludeFilter, setExcludeFilter] = React.useState<string>("");
	const [operator, setOperator] = React.useState<'and' | 'or'>("and");

	var input = document.createElement('input');
	input.type = 'file';

	input.onchange = (e: any) => {
		setSelectedFile(e.target.files[0]);
	};

	if (submit) {
		mainTabStore.setUpdating(true);
		setSubmit(false);
		onClose();
		setTimeout(async () => {
			if (pastedJSON.length > 0) {
				const jsonLines = jsonToJsonl(pastedJSON);
				const lines = jsonLines.split('\n');
				setPastedJSON('');
				mainTabStore.importTab(tabName, importJSONFile(tabName, lines, []));
			} else {
				//fileReaderStore.setMaxLines(maxLines);
				//fileReaderStore.setTimeFilter('msg_timestamp', d1, d2);
				fileReaderStore.setOperator(operator);
				fileReaderStore.setFilters(includeFilter, excludeFilter);
				await fileReaderStore.read(selectedFile);
				fileReaderStore.addTab(tabName);
				setFileReadStore(new FileReaderStore());
			}
			//setSelectedFile(undefined);
			setTabName('');
			//setMaxLines(maxLinesPerTab);
			//setStartTime("");
			//setEndTime("");
			setIncludeFilter('');
			setExcludeFilter('');
			mainTabStore.setUpdating(false);
		}, 1000);
	}

	return (
		<Dialog maxWidth="md" onClose={onClose} aria-labelledby="simple-dialog-title" open={open}>
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
				<hr></hr>
				<div className="primary-text-color">Import File or Paste Text:</div>
				<div style={{ display: "flex", alignItems: "center", margin: ".5rem 0 .5rem 0" }}>
					<button className={'btn btn-primary btn-lg'} style={{ whiteSpace: 'nowrap', marginRight: '.5rem' }}
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
				{selectedFile ? (
					<>
						<hr></hr>
						{selectedFile && (
							<>
								<span style={{ marginRight: '1rem' }}>{selectedFile.name}</span>
								<span className="primary-text-color">{selectedFileSize(selectedFile)}</span>
								<hr></hr>
							</>
						)}
						<div className="primary-text-color">Time Filter - is rounded down to nearest second:</div>
						<div style={{ display: 'flex' }}>
							<input className="form-control" style={{ width: '100%', color: getDateColor(startTime) }}
								type="text"
								placeholder="Start time - (e.g., 2024-02-02T12:48:42.125Z)"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
							/>
							<div className="primary-text-color" style={{ margin: '0 .5rem', lineHeight: '38px' }}>to</div>
							<input className="form-control" style={{ width: '100%', color: getDateColor(endTime) }}
								type="text"
								placeholder="End time - (e.g., 2024-02-02T12:48:43.356Z)"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
							/>
						</div>
						< div title="Maximum number of lines to read">
							<div className="primary-text-color">Maximum lines to read:</div>
							<input className="form-control" style={{ width: '100%' }}
								type="number"
								value={maxLines}
								onChange={(e) => setMaxLines(parseInt(e.target.value))}
							/>
						</div>
						<hr></hr>
						<div style={{ display: 'flex' }}>
							<div className="primary-text-color" style={{}}>Operator:</div>
							<Select
								value={operator === 'and'
									? 'and'
									: 'or'}
								renderValue={() =>
									<span style={{ color: 'black', marginLeft: '.5rem' }}>
										{operator === 'and'
											? <span>AND</span>
											: <span>OR</span>
										}
									</span>
								}
								onChange={(e) => setOperator(e.target.value as 'and' | 'or')}
							>
								<MenuItem
									value="and"
								>
									<ListItemText primary="AND" />
								</MenuItem>
								<MenuItem
									value="or"
								>
									<ListItemText primary="OR" />
								</MenuItem>
							</Select>
						</div>
						<div className="primary-text-color" style={{}}>Include Filter:</div>
						<input className="form-control" style={{ width: '100%' }}
							type="text"
							placeholder="Include lines matching all space separated strings"
							value={includeFilter}
							onChange={(e) => setIncludeFilter(e.target.value)}
						></input>
						<div className="primary-text-color" style={{}}>Exclude Filter:</div>
						<input className="form-control" style={{ width: '100%', marginBottom: '1rem' }}
							type="text"
							placeholder="Exclude lines matching matching all space separated substring"
							value={excludeFilter}
							onChange={(e) => setExcludeFilter(e.target.value)}
						></input>
					</>
				) : null}
				<hr></hr>
				<button className={'btn btn-success btn-lg'} style={{ width: "100%" }}
					disabled={tabName.length === 0 || (!selectedFile && pastedJSON.length === 0)}
					onClick={() => setSubmit(true)}
				>
					Submit
				</button>
			</div>
		</Dialog >
	);
});

function getDateColor(s: string) {
	const d = new Date(s);
	if (d.toString() === "Invalid Date") {
		return 'red';
	}
	return undefined;
}

function selectedFileSize(selectedFile: any): string {
	if (selectedFile.size >= 1024 * 1024 * 1024) {
		return (selectedFile.size / (1024 * 1024 * 1024)).toFixed(1) + 'G';
	} else {
		return (selectedFile.size / (1024 * 1024)).toFixed(1) + 'M';
	}
}

export function jsonToJsonl(jsonString: string) {
	const flatten = function (json: object) {
		let line = JSON.stringify(json);
		line = line.replace(/\\n/g, '');
		line = line.replace(/\\r/g, '');
		line = line.replace(/\\"/g, '');
		return line;
	};

	let jsonLines = jsonString;
	try {
		const json = JSON.parse(jsonString);
		if (Array.isArray(json)) {
			jsonLines = "";
			for (const obj of json) {
				if (jsonLines.length > 0) jsonLines += '\n';
				jsonLines += flatten(obj);
			}
		} else {
			jsonLines = flatten(json);
			for (const field in json) {
				const value = json[field];
				if (Array.isArray(value)) {
					for (const obj of value) {
						if (typeof obj === 'object') {
							jsonLines += "\n" + flatten(obj);
						}
					}
				}
			}
		}
	} catch (e) {
		console.log(e);
	}
	return jsonLines;
}

export default ImportJSONFileDialog;