import FilterStore from '../store/FilterStore';
import { observer } from 'mobx-react-lite';
import BreakpointStore from '../store/BreakpointStore';
import ExcludeTags from './ExcludeTags';
import { messageQueueStore } from '../store/MessageQueueStore';
import { urlPathStore } from '../store/UrlPathStore';

/**
 * Footer view
 */
type Props = {
	filterStore: FilterStore,
	breakpointStore: BreakpointStore
};
const Footer = observer(({ filterStore, breakpointStore }: Props): JSX.Element => {

	function handleSet() {
		filterStore.filterUpdated();
	}

	function handleClear() {
		filterStore.setStartTime('');
		filterStore.setEndTime('');
		filterStore.filterUpdated();
	}

	return (
		<div className="footer__container">
			<div>
				<div className="footer__item" title="Number of messages">
					<div>Messages: {messageQueueStore.getUnfilteredCount()} of {messageQueueStore.getTotalLength()}</div>
				</div>
			</div>
			{urlPathStore.getApp() !== 'jlogviewer' &&
				<div>
					<div className="footer__item" title="Number of active breakpoints">
						<div>Breakpoints: {breakpointStore.getBreakpointCount()}</div>
					</div>
				</div>
			}
			<div className="footer__item footer__exclude-filter">
				{true ?
					<>
						<div className="footer__exclude-label">Time Filter:</div>
						<input className="footer-input form-control" style={{ color: getDateColor(filterStore.getStartTime()) }}
							type="text"
							placeholder="Start Time"
							value={filterStore.getStartTime()}
							onChange={(e) => filterStore.setStartTime(e.target.value)}
						/>
						<div style={{ margin: '0 .5rem', lineHeight: '32px' }}>to</div>
						<input className="footer-input form-control" style={{ color: getDateColor(filterStore.getEndTime()) }}
							type="text"
							placeholder="End Time"
							value={filterStore.getEndTime()}
							onChange={(e) => filterStore.setEndTime(e.target.value)}
						/>
						<button className="btn btn-success" style={{ marginLeft: '.5rem' }}
							disabled={!isDateValid(filterStore.getStartTime()) || !isDateValid(filterStore.getEndTime())}
							onClick={handleSet}
						>
							Set Time
						</button>
						<button className="btn btn-secondary" style={{ marginLeft: '.5rem' }}
							onClick={handleClear}
						>
							Clear Time
						</button>
					</>
					:
					<>
						<div className="footer__exclude-label">Exclude:</div>
						<div>
							<ExcludeTags />
						</div>
						<div className={`header__filter-case ${filterStore.excludeMatchCase() ? 'active' : ''}`}
							title="Match case" onClick={() => filterStore.toggleExcludeMatchCase()}>Aa</div>
					</>
				}
			</div>
		</div>
	);
});

export function isDateValid(time: string) {
	if (time === '') return true;
	const d = new Date(time);
	if (d.toString() === "Invalid Date") {
		return false;
	}
	return true;
}

function getDateColor(time: string) {
	return isDateValid(time) ? 'rgba(232, 230, 227)' : 'red';
}

export default Footer;