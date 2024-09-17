import FilterStore from '../store/FilterStore';
import { observer } from 'mobx-react-lite';
import BreakpointStore from '../store/BreakpointStore';
import { messageQueueStore } from '../store/MessageQueueStore';
import { urlPathStore } from '../store/UrlPathStore';
import { dateToHHMMSS as dateToString } from './Request';
import HighlightTags from './HighlightTags';

/**
 * Footer view
 */
type Props = {
	filterStore: FilterStore,
	breakpointStore: BreakpointStore
};
const Footer = observer(({ breakpointStore }: Props): JSX.Element => {

	return (
		<div className="footer__container">
			<div>
				<div className="footer__item" title="Number of messages">
					<div> {messageQueueStore.getUnfilteredCount()} of {messageQueueStore.getTotalLength()}</div>
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
				{urlPathStore.getKind() === 'jlogviewer' || messageQueueStore.getLayout() === 'Search Match' ?
					<>
						<div className="footer__exclude-label">Highlight JSON:</div>
						<div>
							<HighlightTags />
						</div>
					</>
					:
					<>
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

export default Footer;