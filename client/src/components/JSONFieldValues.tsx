import { observer } from 'mobx-react-lite';
import React from 'react';
import _ from 'lodash';
import { getJsonFieldValues } from '../store/JSONLogStore';

export const JSONFieldButtonsHeight = 40;

type Props = {
	jsonFields: { name: string, count: number, selected: boolean }[]
};
const JSONFieldValues = observer(({ jsonFields }: Props): JSX.Element | null => {
	const [jsonFieldValues, setJsonFieldValues] = React.useState<string[]>([]);
	return (
		<>
			<div style={{
				maxHeight: `calc(${JSONFieldButtonsHeight}px)`,
				overflowY: 'auto'
			}}>
				{jsonFields.map((field) => (
					<span style={{ whiteSpace: "nowrap" }}>
						<button className={"btn btn-sm " + (field.selected ? "btn-success" : "btn-secondary")}
							key={field.name}
							style={{ margin: ".5rem .25rem" }}
							onClick={() => {
								field.selected = !field.selected;
								const selectedFields = jsonFields.map(f => f.selected ? f.name : '').filter(f => f !== '');
								setJsonFieldValues(getJsonFieldValues(selectedFields));
							}}
						>
							{field.name}
						</button>
					</span>
				))}
			</div >
			<div>
				<button className="btn btn-sm btn-primary" style={{ margin: '.5rem 0' }}
					onClick={() => setJsonFieldValues(_.uniq(jsonFieldValues))}
					disabled={jsonFieldValues.length === 0}
				>
					Remove Duplicates
				</button>
			</div><pre>
				{jsonFieldValues.map(value => <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>{value}</div>)}
			</pre>
		</>
	);
});

export default JSONFieldValues;