import { Accordion, AccordionDetails, AccordionSummary, Checkbox, MenuItem } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { namedQueriesStore } from '../store/NamedQueriesStore';
import FilterStore, { filterStore } from '../store/FilterStore';
import NamedQueriesModal from './NamedQueriesModal';
import React from 'react';
import { queryStore } from '../store/QueryStore';
import { urlPathStore } from '../store/UrlPathStore';
import { jsonLogStore } from '../store/JSONLogStore';
import { isJsonLogTab } from './SideBar';

const SideBarQueries = observer((): JSX.Element => {
	const [showNamedQueriesModal, setShowNamedQueriesModal] = React.useState(false);

	function handleAddQueries() {
		setShowNamedQueriesModal(true);
	}

	function handleExecuteQuery(query: FilterStore) {
		queryStore.setApplyFilter(query.getFilter());
	}

	const queries = namedQueriesStore.getQueries();
	return (
		<div>
			<hr className="side-bar-divider" hidden={!urlPathStore.isLocalhost() && queries.length === 0}></hr>
			<div className="side-bar-item" hidden={!filterStore.canDedup() && (!isJsonLogTab() || jsonLogStore.getParsingMethod() === 'auto')}>
				<div>
					<div className="side-bar-checkbox-icon" hidden={!isJsonLogTab() || jsonLogStore.getParsingMethod() === 'auto'}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={jsonLogStore.isBriefChecked()}
								onChange={() => jsonLogStore.toggleBriefChecked()} />
							<div>Less Detail</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon" hidden={!filterStore.canDedup()}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={filterStore.isDedupChecked()}
								onChange={() => filterStore.toggleDedupChecked()} />
							<div>Dedup</div>
						</div>
					</div>
				</div>
			</div>
			<div className="link-opacity" style={{ cursor: 'pointer', marginLeft: '.5rem' }}
				hidden={!urlPathStore.isLocalhost()}
				onClick={handleAddQueries}
			>
				+ Add Queries
			</div>
			< Accordion hidden={queries.length === 0}>
				<AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'whitesmoke' }} />} style={{ backgroundColor: '#333', color: 'whitesmoke' }}>
					<div className="side-bar-item">Queries</div>
				</AccordionSummary>
				<AccordionDetails style={{ backgroundColor: '#333' }}>
					<div style={{ backgroundColor: '#333' }}>
						{
							queries.map(query => (
								<MenuItem
									style={{ background: 'rgb(51, 51, 51)', color: 'whitesmoke' }}
									key={query.getName()}
									title={query.getFilter()}
									onClick={() => handleExecuteQuery(query)}
								>
									<div className="fa fa-search"
										style={{ width: '170px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
									>
										{' ' + query.getName()}
									</div>
								</MenuItem>
							))
						}
					</div>
				</AccordionDetails>
			</Accordion >
			<NamedQueriesModal
				open={showNamedQueriesModal}
				onClose={() => {
					setShowNamedQueriesModal(false);
				}}
				store={namedQueriesStore}
			/>
		</div >
	);
});

export default SideBarQueries;