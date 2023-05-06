import { MenuItem } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { filterStore } from '../store/FilterStore';

type Props = {
};
const FilterBar = observer(({ }: Props): JSX.Element => {
	const [filter, setFilter] = React.useState('');
	const [queries] = React.useState<string[]>([]);
	const [showQueries, setShowQueries] = React.useState(false);


	return (
		<div>
			<input className="header__filter-input" type="search"
				style={{
					background: filter !== filterStore.getFilter() ? '#fffac8' :
						!filterStore.isInvalidFilterSyntax()
							? (filter.length > 0 ? 'lightGreen' : undefined)
							: 'lightCoral',
					color: filter.length > 0 ? 'black' : undefined
				}}
				value={filter}
				onClick={() => setShowQueries(!showQueries)}
				onChange={e => {
					setShowQueries(true);
					setFilter(e.currentTarget.value);
				}}
				onKeyUp={(e) => {
					if (e.keyCode === 13) {
						setShowQueries(false);
						filterStore.setFilterNoDebounce(filter);
						const i = queries.indexOf(filter);
						if (i !== -1)
							queries.splice(i, 1);
						queries.unshift(filter);
					}
				}}
				placeholder={filter !== filterStore.getFilter() ? "Press enter to apply filter..." : "Boolean/Regex Filter: (a || b.*) && !c"} />
			<div className="header__filter-input-queries">
				{queries.map((query) => (
					<MenuItem
						key={query}
						hidden={query.indexOf(filter) === -1 || !showQueries}
						onClick={() => {
							setShowQueries(false);
							setFilter(query)
							filterStore.setFilterNoDebounce(query);
						}}
					>
						{query}
					</MenuItem>
				))}
			</div>
		</div>
	)
});

export default FilterBar;