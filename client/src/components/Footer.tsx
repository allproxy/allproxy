import FilterStore from '../store/FilterStore';
import { observer } from 'mobx-react-lite';
import BreakpointStore from '../store/BreakpointStore';
import ExcludeTags from './ExcludeTags';
import { messageQueueStore } from '../store/MessageQueueStore';
import { urlPathStore } from '../store/UrlPathStore';
import { dateToHHMMSS as dateToString } from './Request';

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
			{urlPathStore.getKind() !== 'jlogviewer' &&
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
							disabled={!stringToDate(filterStore.getStartTime()).ok || !stringToDate(filterStore.getEndTime()).ok}
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

// Convert string to Date.
// return ok === true, if date is valid
export function stringToDate(dateString: string): { date: Date, ok: boolean } {
	if (dateString === '') return { date: new Date(), ok: true };
	let d = new Date(dateString);
	if (d.toString() === "Invalid Date" || dateString.indexOf(':') === -1) {
		const s = getMonthDayYear() + ' ' + dateString;
		d = new Date(s);
		if (d.toString() === 'Invalid Date') {
			return { date: new Date(), ok: false };
		}
	}
	return { date: d, ok: true };
}

// Current MM/DD/YYYY for selected tab
function getMonthDayYear() {
	const messageStores = messageQueueStore.getMessages();
	if (messageStores.length > 0) {
		const messageStore = messageStores[0];
		let date = new Date();
		if (messageStore.getMessage().protocol === 'log:') {
			date = messageStore.getLogEntry().date;
		} else {
			date = new Date(messageStore.getMessage().timestamp);
		}
		return dateToString(date).split(' ')[0];
	}
	return '';
}

function getDateColor(time: string) {
	return stringToDate(time).ok ? 'rgba(232, 230, 227)' : 'red';
}

export default Footer;