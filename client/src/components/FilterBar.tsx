import { ClickAwayListener, IconButton, Link, MenuItem } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { filterStore } from '../store/FilterStore';
import { queryStore } from '../store/QueryStore';
import CloseIcon from "@material-ui/icons/Close";
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import { messageQueueStore } from '../store/MessageQueueStore';
import _ from 'lodash';
import DeleteDialog from './DeleteDialog';
import GTag from '../GTag';

type Props = {

};
const FilterBar = observer(({ }: Props): JSX.Element => {
	const [filter, setFilter] = React.useState('');
	const [queries, setQueries] = React.useState<string[]>([]);
	const [showQueries, setShowQueries] = React.useState(false);
	const [showSavedQueries, setShowSavedQueries] = React.useState(false);
	const [queryToDelete, setQueryToDelete] = React.useState("");
	const [filterHistoryList] = React.useState<string[]>([]);
	const [filterHistoryIndex, setFilterHistoryIndex] = React.useState<number>(0);

	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useLayoutEffect(() => {
		if (queryStore.getApplyFilter() !== '') {
			const query = queryStore.getApplyFilter();
			applyFilter(query);
			queryStore.setApplyFilter('');
		}
	});

	function handleAddEntry() {
		queryStore.extend();
	}

	function handleDeleteQuery(query: string) {
		const i = queries.indexOf(query);
		if (i !== -1) queries.splice(i, 1);
		setQueries(queries.slice());
		queryStore.deleteEntry(query);
	}

	async function applyFilter(query: string, updateHistory: boolean = true) {
		GTag.search(query);

		setShowQueries(false);
		setFilter(query);
		filterStore.setFilterNoDebounce(query);
		if (query.length > 0 && queryStore.canDelete(query)) {
			const i = queries.indexOf(query);
			if (i !== -1)
				queries.splice(i, 1);
			queries.unshift(query);
		}

		if (updateHistory && query.length > 0) {
			// Update history
			if (filterHistoryIndex !== filterHistoryList.length - 1) {
				filterHistoryList.splice(filterHistoryIndex + 1, filterHistoryList.length - filterHistoryIndex - 1);
			}
			filterHistoryList.push(query);
			setFilterHistoryIndex(filterHistoryList.length - 1);
		}
	}

	if (queryStore.getApplyFilter() !== '') {
		// This if is needed to cause a re-render.  See apply filter is don in useLayoutEffect
	}

	return (
		<div style={{ display: 'flex', height: '3rem', alignItems: 'center' }}>
			<div>
				<div className={'header__filter-history fa fa-arrow-left'}
					style={{ pointerEvents: filterHistoryIndex === 0 ? 'none' : undefined, 'opacity': filterHistoryIndex === 0 ? '.5' : undefined }}
					onClick={() => {
						const i = filterHistoryIndex - 1;
						setFilterHistoryIndex(i);
						applyFilter(filterHistoryList[i], false);
					}}
					title={'Click to go back'}
				/>

				<div className={'header__filter-history fa fa-arrow-right'}
					style={{ pointerEvents: filterHistoryIndex >= filterHistoryList.length - 1 ? 'none' : undefined, 'opacity': filterHistoryIndex >= filterHistoryList.length - 1 ? '.5' : undefined }}
					onClick={() => {
						const i = filterHistoryIndex + 1;
						setFilterHistoryIndex(i);
						applyFilter(filterHistoryList[i], false);
					}}
					title={'Click to go forward'}
				/>
			</div>

			<div>
				<input className="header__filter-input" type="search"
					ref={inputRef}
					style={{
						background: filter !== filterStore.getFilter() ? '#fffac8' :
							!filterStore.isInvalidFilterSyntax()
								? (filter.length > 0 ? 'lightGreen' : undefined)
								: 'lightCoral',
						color: filter.length > 0 ? 'black' : undefined
					}}
					value={filter}
					onClick={() => {
						queryStore.init();
						setShowQueries(true);
						setShowSavedQueries(false);
					}}
					onChange={e => {
						setShowQueries(true);
						setFilter(e.currentTarget.value);
					}}
					onKeyUp={(e) => {
						if (e.keyCode === 13) {
							applyFilter(filter);
						}
					}}
					placeholder={filter !== filterStore.getFilter() ? "Press enter to apply filter..." : "Boolean/Regex Filter: (a || b.*) && !c"} />
				<ClickAwayListener onClickAway={(e) => e.target !== inputRef.current && setShowQueries(false)}>
					<div className="header__filter-input-queries">
						<MenuItem
							key="show-saved-queries"
							hidden={!showQueries || !messageQueueStore.getSaveQueriesFeature()}
							style={{ background: 'rgb(51, 51, 51)', color: 'whitesmoke' }}
						>
							<button className="btn btn-sm btn-secondary"
								style={{
									width: '7rem', marginRight: '.5rem'
								}}
								onClick={() => {
									setShowSavedQueries(!showSavedQueries);
								}}
							>
								{showSavedQueries ? '<--' : 'Saved Queries'}
							</button>
							<button className="btn btn-sm btn-primary"
								hidden={!showSavedQueries}
								onClick={handleAddEntry}
							>
								+ New Query
							</button>
						</MenuItem>
						{!showSavedQueries ?
							_.uniq(queries.concat(queryStore.getQueries())).map((query) => (
								<MenuItem
									className="filter-bar__menu-item"
									key={query}
									style={{ paddingLeft: 0 }}
									hidden={query.indexOf(filter) === -1 || !showQueries}
								>
									<div className="filter-bar__menu-item-links"
										hidden={!queryStore.canDelete(query)}
									>
										<Link href="#" style={{ color: 'red' }}
											onClick={() => {
												setQueryToDelete(query);
											}}>
											<CloseIcon />
										</Link>
										<Link href="#"
											onClick={() => queryStore.addAndSaveQuery(query)}
											hidden={queryStore.getQueries().indexOf(query) !== -1}
											style={{ marginRight: "0rem", color: 'green' }}>
											<BookmarkAddIcon />
										</Link>
									</div>
									<div
										style={{ width: '100%', height: '100%', marginLeft: '.5rem' }}
										onClick={() => {
											applyFilter(query);
										}}
									>
										{query}
									</div>
								</MenuItem>
							)) : (
								<>
									{queryStore.getQueries().map((query, i) =>
										<MenuItem
											key={i}
											hidden={!showQueries}
											style={{
												display: 'flex', alignItems: 'center',
											}}>
											<IconButton onClick={() => handleDeleteQuery(query)} title="Delete query">
												<CloseIcon style={{ color: 'red' }} />
											</IconButton>
											<button className="btn btn-sm btn-success"
												onClick={() => applyFilter(query)}
											>
												Run
											</button>
											<div
												style={{
													width: '100%',
												}}
											>
												<input className="form-control"
													value={query}
													onChange={(e) => {
														queryStore.saveQuery(i, e.currentTarget.value);
													}} />
											</div>
										</MenuItem>
									)}
								</>
							)
						}
					</div>
				</ClickAwayListener >
				<DeleteDialog
					open={queryToDelete.length > 0}
					onClose={(doDelete: boolean) => {
						setQueryToDelete("");
						if (doDelete) {
							handleDeleteQuery(queryToDelete);
						}
					}} />
			</div >
		</div>
	);
});

export default FilterBar;