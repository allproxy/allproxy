import { observer } from 'mobx-react-lite';
import React from 'react';
import { Dialog, DialogTitle, ListItemText, MenuItem, Select, Tab, Tabs } from '@material-ui/core';
import { mainTabStore } from '../store/MainTabStore';
import { importJSONFile } from '../ImportJSONFile';
import FileReaderStore from '../store/FileReaderStore';
import { TabContext, TabPanel } from '@material-ui/lab';
import { socketStore } from '../store/SocketStore';

//const bigFileSize = 1024 * 1024 * 1024; // 1G
const timeFieldName = 'ts_millis';
const disableServerRead = true;

type Props = {
	open: boolean,
	onClose: () => void,
};
const ImportJSONFileDialog = observer(({ open, onClose }: Props) => {
	const [pastedJSON, setPastedJSON] = React.useState<string>("");
	const [tabName, setTabName] = React.useState<string>("");
	const [selectedFile, setSelectedFile] = React.useState<File | undefined>(undefined);
	const [isSorted, setIsSorted] = React.useState<boolean | undefined>(undefined);
	const [submit, setSubmit] = React.useState(false);
	const [fileReaderStore, setFileReaderStore] = React.useState(new FileReaderStore());
	const [includeFilter, setIncludeFilter] = React.useState<string>("");
	const [operator, setOperator] = React.useState<'and' | 'or'>("and");
	const [timeFilterSupported, setTimeFieldSupported] = React.useState(false);
	const [serverReadSupported, setServerReadSupported] = React.useState(false);
	const [startTime, setStartTime] = React.useState<string>("");
	const [endTime, setEndTime] = React.useState<string>("");
	const [tabValue, setTabValue] = React.useState<'1' | '2'>('1');

	var input = document.createElement('input');
	input.type = 'file';

	input.onchange = async (e: any) => {
		const file = e.target.files[0] as File;
		setSelectedFile(file);
		const useServer = socketStore.isConnected() && await socketStore.emitIsFileInDownloads(file.name) && !disableServerRead;
		setServerReadSupported(useServer);
		let timeFieldExists = false;
		if (useServer) {
			timeFieldExists = await socketStore.emitJsonFieldExists(file.name, timeFieldName);
		} else {
			timeFieldExists = await FileReaderStore.clientTimeFieldExists(file, timeFieldName);
		}
		setTimeFieldSupported(timeFieldExists);
		if (timeFieldExists && useServer) {
			const { socketStore } = await import('../store/SocketStore');
			const sorted = await socketStore.emitIsSorted(file.name, timeFieldName);
			setIsSorted(sorted);
			if (!sorted) {
				mainTabStore.setUpdating(true, `Sorting ${file.name}`);
				await socketStore.emitSortFile(file.name);
				mainTabStore.setUpdating(false);
				setIsSorted(await socketStore.emitIsSorted(file.name, timeFieldName));
			}
		}
	};

	function fileName(): string {
		if (selectedFile === undefined) return '';
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
				fileReaderStore.setTimeFilter(timeFieldName, startTime, endTime);

				if (serverReadSupported) {
					await fileReaderStore.serverRead(fileName());
				} else {
					await fileReaderStore.clientRead(selectedFile);
				}

				fileReaderStore.addTab(tabName, serverReadSupported ? undefined : 'sort');
				setFileReaderStore(new FileReaderStore());
			}

			mainTabStore.setUpdating(false);

			//setSelectedFile(undefined);
			setTabName('');
			setStartTime('');
			setEndTime('');
			setIncludeFilter('');
		}, 1000);
	}

	return (
		<>
			<Dialog fullWidth={true} maxWidth="lg" onClose={onClose} aria-labelledby="simple-dialog-title" open={open}>
				<DialogTitle id="simple-dialog-title">Import JSON Log</DialogTitle>
				<div style={{ padding: " 0 1rem 1rem 1rem" }}>
					<div style={{ display: 'flex' }}>
						<div className="primary-text-color" style={{ whiteSpace: 'nowrap', lineHeight: '48px', marginRight: '.5rem' }}>Tab Name:</div>
						<input
							style={{ height: "48px", marginBottom: "1rem" }}
							className="form-control"
							value={tabName}
							onChange={(value) => setTabName(value.target.value)} />
					</div>
					<TabContext value={tabValue}>
						<Tabs
							variant='scrollable'
							value={tabValue}
							onChange={(_, v) => setTabValue(v)}
							textColor="primary"
							indicatorColor="primary"
							aria-label="import-tabs"
						>
							<Tab value="1" label="Select File" />
							<Tab value="2" label="Paste JSON" />
						</Tabs>
						<TabPanel value="1" key="1">
							<button className={'btn btn-primary btn-lg'} style={{ whiteSpace: 'nowrap', marginRight: '.5rem' }}
								onClick={() => input.click()}
							>
								Select File
							</button>
							{selectedFile ? (
								<>
									<hr></hr>
									<span style={{ marginRight: '1rem' }}>{selectedFile.name}</span>
									<span className="primary-text-color">{displayFileSize(selectedFile.size)}</span>
									{isSorted !== undefined &&
										< span style={{ marginLeft: '.5rem', borderRadius: '.5rem', background: isSorted ? 'green' : 'red', color: 'white', padding: '0 .5rem' }}>
											{isSorted ? 'Sorted' : 'Unsorted'}
										</span>
									}
									{timeFilterSupported &&
										<>
											<hr></hr>
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
										</>
									}
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
						</TabPanel>
						<TabPanel value="2" key="2">
							<textarea
								className="form-control"
								style={{ width: "100%", height: "calc(3 * 48px)" }}
								placeholder="Paste Text Here"
								value={pastedJSON}
								onChange={(value) => { setPastedJSON(value.target.value); }} />
						</TabPanel>
					</TabContext>
					<button className={'btn btn-success btn-lg'} style={{ width: "100%" }}
						disabled={tabName.length === 0 || (!selectedFile && pastedJSON.length === 0)}
						onClick={() => setSubmit(true)}
					>
						Submit
					</button>
				</div >
			</Dialog >
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
