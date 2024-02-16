import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle, FormControl, FormControlLabel, ListItemText, MenuItem, Radio, RadioGroup, Select } from '@material-ui/core';
import { mainTabStore } from '../store/MainTabStore';
import { importJSONFile } from '../ImportJSONFile';
import FileReaderStore from '../store/FileReaderStore';
import FileSubsetStore, { areSubsetsSupported, timeFieldName } from '../store/FileSubsetStore';
import NewSubsetDialog from './NewSubsetDialog';
import { dateToHHMMSS } from './Request';
import CloseIcon from "@material-ui/icons/Close";

const bigFileSize = 1024 * 1024 * 1024; // 1G

type Props = {
	open: boolean,
	onClose: () => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [pastedJSON, setPastedJSON] = React.useState<string>("");
	const [tabName, setTabName] = React.useState<string>("");
	const [selectedFile, setSelectedFile] = React.useState<File | undefined>(undefined);
	const [submit, setSubmit] = React.useState(false);
	const [fileReaderStore, setFileReaderStore] = React.useState(new FileReaderStore());
	const [fileSubsetStore] = React.useState(new FileSubsetStore());
	const [includeFilter, setIncludeFilter] = React.useState<string>("");
	const [operator, setOperator] = React.useState<'and' | 'or'>("and");
	const [selectedSubset, setSelectedSubset] = React.useState<string>("");
	const [openNewSubsetDialog, setOpenNewSubsetDialog] = React.useState(false);
	const [subsetSupported, setSubsetSupported] = React.useState(false);
	const [startTime, setStartTime] = React.useState<string>("");
	const [endTime, setEndTime] = React.useState<string>("");

	var input = document.createElement('input');
	input.type = 'file';

	input.onchange = async (e: any) => {
		const file = e.target.files[0] as File;
		setSelectedFile(file);
		const supported = file.size > bigFileSize && await areSubsetsSupported(file.name);
		if (supported) {
			await fileSubsetStore.init(file.name);
			if (fileSubsetStore.getSubsets().length > 0) {
				setSelectedSubset(fileSubsetStore.getSubsets()[0].filterValue);
			}
		}
		setSubsetSupported(supported);
	};

	function fileName(): string {
		if (selectedFile === undefined) return '';
		if (selectedSubset !== '') {
			const fileName = selectedFile.name;
			const i = fileName.lastIndexOf('.');
			return fileName.substring(0, i) + '-' + selectedSubset + fileName.substring(i);
		}
		return selectedFile.name;
	}

	if (submit) {
		setSubmit(false);
		onClose();
		setTimeout(async () => {
			if (pastedJSON.length > 0) {
				mainTabStore.setUpdating(true, 'Importing pasted JSON...');
				const jsonLines = jsonToJsonl(pastedJSON);
				const lines = jsonLines.split('\n');
				setPastedJSON('');
				mainTabStore.importTab(tabName, importJSONFile(tabName, lines, []));
			} else {
				mainTabStore.setUpdating(true, 'Importing ' + fileName());
				fileReaderStore.setOperator(operator);
				fileReaderStore.setFilters(includeFilter);
				if (selectedSubset !== '' && selectedSubset !== 'none') {
					if (startTime !== '') {
						let endTime2 = endTime;
						if (endTime2 === '') {
							endTime2 = new Date().toISOString();
						}
						await fileReaderStore.serverSubsetRead(fileName(), timeFieldName, startTime, endTime2);
					} else {
						await fileReaderStore.serverRead(fileName());
					}
				} else {
					const { socketStore } = await import('../store/SocketStore');
					if (socketStore.isConnected() && await socketStore.emitIsFileInDownloads(fileName())) {
						await fileReaderStore.serverRead(fileName());
					} else {
						await fileReaderStore.clientRead(selectedFile);
					}
				}
				fileReaderStore.addTab(tabName);
				setFileReaderStore(new FileReaderStore());
			}
			//setSelectedFile(undefined);
			setTabName('');
			setStartTime('');
			setEndTime('');
			setIncludeFilter('');
			mainTabStore.setUpdating(false);
		}, 1000);
	}

	return (
		<>
			<Dialog maxWidth="md" onClose={onClose} aria-labelledby="simple-dialog-title" open={open}>
				<DialogTitle id="simple-dialog-title">Import JSON Log</DialogTitle>
				<div style={{ padding: " 0 1rem 1rem 1rem" }}>
					<div className="primary-text-color">Tab Name:</div>
					<input
						style={{ height: "48px", marginBottom: "1rem" }}
						className="form-control"
						placeholder="Tab Name"
						value={tabName}
						onChange={(value) => setTabName(value.target.value)} />
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
							onChange={(value) => { setPastedJSON(value.target.value); }} />
					</div>
					{selectedFile ? (
						<>
							<hr></hr>
							<span style={{ marginRight: '1rem' }}>{selectedFile.name}</span>
							<span className="primary-text-color">{displayFileSize(selectedFile.size)}</span>
							{subsetSupported &&
								<>
									<hr></hr>
									<div>
										<button className="btn btn-lg btn-success"
											onClick={() => setOpenNewSubsetDialog(true)}
										>
											+ New Sorted Subset
										</button>
										<div>
											<FormControl component="fieldset">
												{/* <FormLabel component="legend">Subset</FormLabel> */}
												<RadioGroup aria-label="subset" name="subset1"
													value={selectedSubset}
													onChange={(e) => setSelectedSubset(e.target.value)}>
													<FormControlLabel value="none" control={<Radio />}
														label={
															<div style={{ display: 'flex' }}>
																<div style={{ width: '200px', paddingRight: '1rem' }}>
																	None
																</div>
															</div>
														} style={{ margin: 0 }} />
													{fileSubsetStore.getSubsets().map((subset) => (
														<FormControlLabel value={subset.filterValue} control={<Radio />}
															label={
																<div style={{ display: 'flex' }}>
																	<div
																		style={{ alignSelf: 'center', verticalAlign: 'middle', marginRight: '.5rem' }}
																		onClick={() => fileSubsetStore.deleteSubset(selectedFile.name, subset)} title="Delete subset">
																		<CloseIcon style={{ color: 'red' }} />
																	</div>
																	<div style={{ width: '200px', paddingRight: '1rem' }}>
																		{subset.filterValue}
																	</div>
																	<div style={{ width: '100px', paddingRight: '1rem' }}
																		className="primary-text-color">
																		{displayFileSize(subset.fileSize)}
																	</div>
																	<div>
																		<span>{dateToHHMMSS(new Date(subset.startTime))}</span>
																		<span className="primary-text-color"> to </span>
																		<span>{dateToHHMMSS(new Date(subset.endTime))}</span>
																	</div>
																</div>
															} style={{ margin: 0 }} />
													))}
												</RadioGroup>
											</FormControl>
										</div>
										{selectedSubset && selectedSubset !== 'none' &&
											<div>
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
											</div>
										}
									</div>
								</>}
							<hr></hr>
							<div style={{ display: 'flex' }}>
								<div className="primary-text-color" style={{}}>Operator:</div>
								<Select
									value={operator === 'and'
										? 'and'
										: 'or'}
									renderValue={() => <span style={{ color: 'black', marginLeft: '.5rem' }}>
										{operator === 'and'
											? <span>AND</span>
											: <span>OR</span>}
									</span>}
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
							<div className="primary-text-color" style={{}}>Filter:</div>
							<input className="form-control" style={{ width: '100%' }}
								type="text"
								value={includeFilter}
								onChange={(e) => setIncludeFilter(e.target.value)}
							></input>
						</>
					) : null
					}
					<hr></hr>
					<button className={'btn btn-success btn-lg'} style={{ width: "100%" }}
						disabled={tabName.length === 0 || (!selectedFile && pastedJSON.length === 0)}
						onClick={() => setSubmit(true)}
					>
						Submit
					</button>
				</div >
			</Dialog >
			<NewSubsetDialog open={openNewSubsetDialog}
				fileName={selectedFile ? selectedFile.name : ''}
				selectableSubsets={fileSubsetStore.getSelectableSubsets()}
				onClose={(result: { filterValue: string, fileSize: number, startTime: string, endTime: string } | undefined) => {
					setOpenNewSubsetDialog(false);
					if (result) {
						fileSubsetStore.newSubset(result);
						if (selectedSubset === '') {
							setSelectedSubset(result.filterValue);
						}
					}
				}} />
		</>
	);
});

function displayFileSize(size: number): string {
	if (size >= 1024 * 1024 * 1024) {
		return (size / (1024 * 1024 * 1024)).toFixed(1) + 'G';
	} else {
		return (size / (1024 * 1024)).toFixed(1) + 'M';
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

function getDateColor(s: string) {
	const d = new Date(s);
	if (d.toString() === "Invalid Date") {
		return 'red';
	}
	return undefined;
}

export default ImportJSONFileDialog;
