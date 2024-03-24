import { Accordion, AccordionDetails, AccordionSummary, Menu, MenuItem } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import NamedQueriesStore, { namedQueriesStore, namedSubQueriesStore } from '../store/NamedQueriesStore';
import FilterStore, { filterStore } from '../store/FilterStore';
import NamedQueriesModal from './NamedQueriesModal';
import React from 'react';
import { queryStore } from '../store/QueryStore';

type Props = {
	orCondition: boolean,
	name: string,
	store: NamedQueriesStore,
	icon: string,
};
const Queries = observer(({ orCondition, name, store, icon }: Props): JSX.Element => {

	function handleQuery(e: any, query: FilterStore) {
		e.stopPropagation();
		queryStore.setApplyFilter(query.getFilter());
	}

	function handleORCondition(e: any, query: FilterStore) {
		e.stopPropagation();
		let filter = filterStore.getFilter().trim();
		if (filter.length > 0) {
			filter = query.getFilter() + ' OR ' + filter;
		} else {
			filter = query.getFilter();
		}
		queryStore.setApplyFilter(filter);
	}

	const queries = store.getQueries();
	return (
		<>
			< Accordion hidden={queries.length === 0}>
				<AccordionSummary expandIcon={<ExpandMoreIcon style={{ color: 'whitesmoke' }} />} style={{ backgroundColor: '#333', color: 'whitesmoke' }}>
					<div className="side-bar-item">{name}</div>
				</AccordionSummary>
				<AccordionDetails style={{ backgroundColor: '#333' }}>
					<div style={{ backgroundColor: '#333' }}>
						{
							queries.map(query => (
								<MenuItem
									style={{ background: 'rgb(51, 51, 51)', color: 'whitesmoke' }}
									key={query.getName()}
									title={query.getFilter()}
									onClick={(e) => !orCondition ? handleQuery(e, query) : handleORCondition(e, query)}
								>
									<div
										style={{ marginLeft: '.5rem', width: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
									>
										<span className={icon} style={{ fontSize: '.75rem' }} /><span>{' ' + query.getName()}</span>
									</div>
								</MenuItem>
							))
						}
					</div>
				</AccordionDetails>
			</Accordion >
		</>
	);
});

const SideBarQueries = observer((): JSX.Element => {
	const [showNamedQueriesModal, setShowNamedQueriesModal] = React.useState<undefined | NamedQueriesStore>(undefined);
	const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

	return (
		<div>
			<hr className="side-bar-divider"></hr>
			<div className="side-bar-item">
				<div
					style={{ cursor: 'pointer' }}
					onClick={(_event: React.MouseEvent<HTMLDivElement>) => {
						setShowNamedQueriesModal(namedQueriesStore);
						//setAnchorEl(event.currentTarget);
					}}>
					<span className="fa fa-pen" style={{ fontSize: '.75rem' }} /><span> Queries</span>
				</div>
				<Menu
					anchorEl={anchorEl}
					open={Boolean(anchorEl)}
					onClose={() => { setAnchorEl(null); }}
				>
					<MenuItem onClick={() => {
						setShowNamedQueriesModal(namedQueriesStore);
						setAnchorEl(null);
					}}>
						<div className="link-opacity" style={{ cursor: 'pointer', marginLeft: '.5rem' }}
						>
							Edit Queries
						</div>
					</MenuItem>
					<MenuItem onClick={() => {
						setShowNamedQueriesModal(namedSubQueriesStore);
						setAnchorEl(null);
					}}>
						<div className="link-opacity" style={{ cursor: 'pointer', marginLeft: '.5rem' }}
						>
							Edit OR Conditions
						</div>
					</MenuItem>
				</Menu>
			</div>
			<Queries orCondition={false} name="Query" icon="fa fa-search" store={namedQueriesStore} />
			{/* <Queries orCondition={true} name="Add OR Condition" icon="fa fa-grip-lines-vertical" store={namedSubQueriesStore} /> */}
			<NamedQueriesModal
				name={showNamedQueriesModal === namedQueriesStore ? 'Queries' : 'OR Conditions'}
				open={showNamedQueriesModal !== undefined}
				onClose={() => {
					setShowNamedQueriesModal(undefined);
				}}
				store={showNamedQueriesModal as NamedQueriesStore}
			/>
		</div >
	);
});

export default SideBarQueries;