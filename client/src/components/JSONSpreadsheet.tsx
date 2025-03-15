import { observer } from 'mobx-react-lite';
import React from 'react';
import _ from 'lodash';
import { getJsonSpreadsheetLines as getJsonSpreadsheetRows } from '../store/JSONLogStore';
import { ListItemText, MenuItem, Select, Tooltip } from '@material-ui/core';

export const JSONFieldButtonsHeight = 40;

type Props = {
	jsonFields: { name: string, count: number, selected: boolean }[]
};

export const DefaultSortBy = 'Default';

let order = 0; // order in FIFO order

const JSONSpreadsheet = observer(({ jsonFields }: Props): JSX.Element | null => {
	const [rows, setRows] = React.useState<string[]>([]);
	const [dupCountMap, setDupCountMap] = React.useState<{ [key: string]: number }>({});
	const [selectedFields, setSelectedFields] = React.useState<string[]>([]);
	const [sortBy, setSortBy] = React.useState(DefaultSortBy);
	const [filter, setFilter] = React.useState('');

	return (
		<>
			<div style={{
				maxHeight: `calc(${JSONFieldButtonsHeight}px)`,
				overflowY: 'auto'
			}}>
				{jsonFields.map((field) => (
					//field.name.indexOf('[') === -1 &&
					<span style={{ whiteSpace: "nowrap" }}>
						<button className={"btn btn-sm " + (field.selected ? "btn-success" : "btn-secondary")}
							key={field.name}
							style={{ margin: ".5rem .25rem" }}
							onClick={() => {
								field.count = ++order; // use count field to order fields in FIFO order
								field.selected = !field.selected;
								const sortedFields = [...jsonFields];
								sortedFields.sort((a, b) => a.count - b.count);
								const s = sortedFields.map(f => f.selected ? f.name : '').filter(f => f !== '');
								const output = getJsonSpreadsheetRows(s, sortBy);
								setRows(output.lines);
								setDupCountMap(output.dupCountMap);
								setSelectedFields(s);
								if (s.indexOf(sortBy) === -1) setSortBy(DefaultSortBy);
							}}
						>
							{field.name}
						</button>
					</span>
				))}
			</div >
			<div style={{ display: 'flex' }}>
				<button className="btn btn-sm btn-primary" style={{ margin: '.5rem 0' }}
					onClick={() => {
						setRows(_.uniq(rows));
					}}
					disabled={rows.length === 0}
				>
					Remove Duplicates
				</button>
				<div className="btn-sm primary-text-color" style={{ fontWeight: 'bold', margin: '.5rem 0 .5rem .5rem', paddingRight: 0 }}
				>
					Sort By:
				</div>
				<Select
					value={sortBy}
					renderValue={() => <span style={{ color: 'black', marginLeft: '.5rem' }}>
						<span>{sortBy}</span>
					</span>}
					onChange={(e) => {
						const v = e.target.value as string;
						setSortBy(v);
						const output = getJsonSpreadsheetRows(selectedFields, v);
						setRows(output.lines);
						setDupCountMap(output.dupCountMap);
					}}
				>
					<MenuItem
						value={DefaultSortBy}
					>
						<ListItemText primary={DefaultSortBy} />
					</MenuItem>
					{selectedFields.map(field =>
						<MenuItem
							value={field}
						>
							<ListItemText primary={field} />
						</MenuItem>
					)}
				</Select>
				<input style={{ margin: '.5rem 0 .5rem .5rem', height: 32, width: '50vw' }} placeholder='Filter'
					onChange={(e) => setFilter(e.target.value)}
				/>
			</div >
			<pre>
				{rows.map((value, i) =>
					value.toLowerCase().indexOf(filter.toLowerCase()) !== -1 &&
					<Tooltip
						title={<span>
							{'Duplicate count ' + dupCountMap[value]}
						</span>}>
						<div style={{ fontFamily: "'Courier New', Courier, monospace", pointerEvents: dupCountMap[value] === 1 ? "none" : undefined }}>
							<span className="primary-text-color">
								{(i === 0 ? ' ' : i) + ' '.repeat(rows.length.toString().length - i.toString().length + 1)}</span>{value}
						</div>
					</Tooltip>
				)}
			</pre >
		</>
	);
});

export default JSONSpreadsheet;