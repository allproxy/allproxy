import { ClickAwayListener, IconButton, MenuItem } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { filterStore } from '../store/FilterStore';
import { queryStore } from '../store/QueryStore';
import CloseIcon from "@material-ui/icons/Close";

type Props = {
};
const FilterBar = observer(({ }: Props): JSX.Element => {
	const [filter, setFilter] = React.useState('');
	const [queries] = React.useState<string[]>([]);
	const [showQueries, setShowQueries] = React.useState(false);
	const [showSavedQueries, setShowSavedQueries] = React.useState(false);

	const inputRef = React.useRef<HTMLInputElement>(null);

	function handleAddEntry() {
		queryStore.extend();
	}

	function handleDeleteQuery(i: number) {
		queryStore.deleteEntry(i);
	}

	async function doFilter(query: string) {
		setShowQueries(false);
		setFilter(query)
		filterStore.setFilterNoDebounce(query);
		if (query.length > 0) {
			const i = queries.indexOf(query);
			if (i !== -1)
				queries.splice(i, 1);
			queries.unshift(query);
		}
	}

	return (
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
						doFilter(filter);
					}
				}}
				placeholder={filter !== filterStore.getFilter() ? "Press enter to apply filter..." : "Boolean/Regex Filter: (a || b.*) && !c"} />
			<ClickAwayListener onClickAway={(e) => e.target !== inputRef.current && setShowQueries(false)}>
				<div className="header__filter-input-queries">
					<MenuItem
						key="show-saved-queries"
						hidden={!showQueries}
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
						queries.map((query) => (
							<MenuItem
								key={query}
								hidden={query.indexOf(filter) === -1 || !showQueries}
								onClick={() => {
									doFilter(query);
								}}
							>
								<button className="btn btn-sm btn-success"
									style={{ marginRight: '.5rem' }}
									disabled={queryStore.getQueries().indexOf(query) !== -1}
									onClick={() => queryStore.addAndSaveQuery(query)}
								>
									Save
								</button>
								{query}
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
										<IconButton onClick={() => handleDeleteQuery(i)} title="Delete query">
											<CloseIcon style={{ color: 'red' }} />
										</IconButton>
										<button className="btn btn-sm btn-success"
											onClick={() => doFilter(query)}
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
		</div >
	)
});

export default FilterBar;