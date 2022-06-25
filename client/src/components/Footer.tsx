import FilterStore from '../store/FilterStore';
import SocketStore from '../store/SocketStore';
import { observer } from 'mobx-react-lite';
import MessageQueueStore from '../store/MessageQueueStore';
import BreakpointStore from '../store/BreakpointStore';
import ExcludeTags from './ExcludeTags';

/**
 * Footer view
 */
type Props = {
	socketStore: SocketStore,
	messageQueueStore: MessageQueueStore,
	filterStore: FilterStore,
	breakpointStore: BreakpointStore
};
const Footer = observer(({ socketStore, messageQueueStore, filterStore, breakpointStore }: Props): JSX.Element => {

	function getDisplayedCount(): number {
		let n = 0;
		messageQueueStore.getMessages().forEach((messageStore) => {
			if (!filterStore.isFiltered(messageStore)) ++n;
		})
		return n;
	}

	return (
		<div className="footer__container">
			<div>
				<div className="footer__count" title="Received messages">
					<div>{getDisplayedCount() + ' of ' + messageQueueStore.getTotalLength()}</div>
				</div>
			</div>
			<div>
				<div className="footer__count" title="Received messages">
					{socketStore.getRequestCount() > socketStore.getResponseCount() ??
						<div>No Response: {socketStore.getRequestCount() - socketStore.getResponseCount()}</div>
					}
				</div>
				<div className="footer__count" title="Messages queued at server">
					<div>Queued: {socketStore.getQueuedCount()}</div>
				</div>
			</div>
			<div>
				<div className="footer__count" title="Number of active breakpoints">
					<div>Breakpoints: {breakpointStore.getBreakpointCount()}</div>
				</div>
			</div>
			<div className="footer__exclude-filter">
				<div style={{marginRight: '.5rem'}}>Exclude:</div>
				<div>
					<ExcludeTags/>
				</div>
			</div>
		</div>
	)
});

export default Footer;