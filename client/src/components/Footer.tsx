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
				<div className="footer__exclude-label">Exclude:</div>
				<div>
					<ExcludeTags />
				</div>
				<div className={`header__filter-case ${filterStore.excludeMatchCase() ? 'active' : ''}`}
					title="Match case" onClick={() => filterStore.toggleExcludeMatchCase()}>Aa</div>
			</div>
		</div>
	);
});

export default Footer;