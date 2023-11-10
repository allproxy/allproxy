import React from 'react';
import { observer } from 'mobx-react-lite';
import { filterStore } from '../store/FilterStore';
import MessageQueueStore from '../store/MessageQueueStore';
import Request from './Request';
import Response from './Response';
import ResendModal from './ResendModal';
import ResendStore from '../store/ResendStore';
import Message from '../common/Message';
import BreakpointResponseModal from './BreakpointResponseModal';
import { breakpointStore } from '../store/BreakpointStore';
import { Fade, IconButton } from '@material-ui/core';
import JSONFieldButtons from './JSONFieldButtons';
import { snapshotStore } from '../store/SnapshotStore';
import CloseIcon from "@material-ui/icons/Close";
import LayoutStore from '../store/LayoutStore';

let minEntryHeight = 26;

type Props = {
	messageQueueStore: MessageQueueStore,
	selectedReqSeqNum: number,
	setSelectedReqSeqNum: (seqNum: number) => void,
	scrollTop: number,
	setScrollTop: (scrollTop: number) => void,
	highlightSeqNum: number,
	setHighlightSeqNum: (seqNum: number) => void,
}

const SnapshotTabContent = observer(({
	messageQueueStore, selectedReqSeqNum, setSelectedReqSeqNum, scrollTop, setScrollTop,
	highlightSeqNum, setHighlightSeqNum
}: Props) => {
	const [resendStore, setResendStore] = React.useState<ResendStore>();
	const [clickPendingSeqNum, setClickPendingSeqNum] = React.useState(Number.MAX_SAFE_INTEGER);

	const messageStore = breakpointStore.getMessageStore();

	const requestContainerRef = React.useRef<HTMLDivElement>(null);

	React.useLayoutEffect(() => {
		messageQueueStore.setHighlightSeqNum(highlightSeqNum);
	});

	React.useEffect(() => {
		if (clickPendingSeqNum !== Number.MAX_SAFE_INTEGER) {
			handleClick(clickPendingSeqNum);
			setClickPendingSeqNum(Number.MAX_SAFE_INTEGER);
		}
		if (messageQueueStore.getScrollPending()) {
			if (messageQueueStore.getScrollToTop()) {
				if (matchCount > 0) {
					let firstSeqNum = 0;
					for (const messageStore of messageQueueStore.getMessages()) {
						if (!filterStore.isFilteredNoCache(messageStore)) {
							firstSeqNum = messageStore.getMessage().sequenceNumber;
							break;
						}
					}
					messageQueueStore.setScrollToSeqNum(firstSeqNum);
					setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
				}
				messageQueueStore.setScrollToTop(false);
			}
			if (messageQueueStore.getScrollToBottom()) {
				if (matchCount > 0) {
					let lastSeqNum = 0;
					messageQueueStore.getMessages()
						.forEach(messageStore => {
							if (!filterStore.isFilteredNoCache(messageStore)) {
								lastSeqNum = messageStore.getMessage().sequenceNumber;
							}
						});
					messageQueueStore.setScrollToSeqNum(lastSeqNum);
					setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
				}
				messageQueueStore.setScrollToBottom(false);
			}
			messageQueueStore.setScrollPending(false);
		}
	});

	function updateScroll() {
		if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			if (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER) {
				doScrollTo(selectedReqSeqNum);
			}
		} else {
			restoreScrollTop();
		}
	}

	function checkForScrollTo() {
		if (messageQueueStore.getScrollToSeqNum() !== null) {
			const seqNum = messageQueueStore.getScrollToSeqNum();
			messageQueueStore.setScrollToSeqNum(null);
			if (seqNum !== null) {
				doScrollTo(seqNum, 3000);
				messageQueueStore.setHighlightSeqNum(seqNum);
				setHighlightSeqNum(seqNum);
			}
		}
	}

	let maxStatusSize = 0;
	let maxMethodSize = 0;
	let maxEndpointSize = 0;
	messageQueueStore.getMessages()
		.forEach((messageStore) => {
			maxStatusSize = Math.max(maxStatusSize, (messageStore.getMessage().status + '').length);
			const method = messageStore.getMessage().method;
			maxMethodSize = Math.max(maxMethodSize, method ? method.length : 0);
			maxEndpointSize = Math.max(maxEndpointSize, messageStore.getMessage().endpoint.length);
		});

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	let matchCount = 0;
	let layout = snapshotStore.getLayout(snapshotStore.getSelectedSnapshotName());
	if (layout === undefined) layout = new LayoutStore();
	const vertical = layout.isVertical();
	const requestContainerLayout = layout.requestContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);
	const responseContainerLayout = layout.responseContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);


	let renderedCount = 0;
	let renderCount = calcRenderCount(scrollTop);

	console.log('render');
	return (
		<div style={{
			opacity: clickPendingSeqNum !== Number.MAX_SAFE_INTEGER || messageQueueStore.getScrollPending() ? '.7' : snapshotStore.isUpdating() ? '.3' : undefined
		}}>
			<div className="jsonfieldbuttons">
				{JSONFieldButtons(messageQueueStore)}
			</div>
			<div className="request-response__container"
				style={{ flexDirection: layout.flexDirection() }}
			>
				{
					messageQueueStore.getMessages().length > 0 &&
					<div className={'request__container '
						+ (selectedReqSeqNum === Number.MAX_SAFE_INTEGER ? 'unselected' : '')}
						style={{ width: requestContainerLayout.width, height: requestContainerLayout.height }}
						ref={requestContainerRef} onScroll={handleScroll}>
						{messageQueueStore.getMessages().map((messageStore, index) => {
							const message = messageStore.getMessage();
							const seqNum = message.sequenceNumber;
							const isActiveRequest = selectedReqSeqNum === seqNum;
							const isFiltered = renderedCount >= renderCount && highlightSeqNum < seqNum && !messageQueueStore.getFullPageSearch()
								|| ((!snapshotStore.isUpdating() || snapshotStore.getUpdatingMessage().length === 0) && filterStore.isFilteredNoCache(messageStore));
							if (!isActiveRequest && isFiltered) {
								return null;
							} else {
								++renderedCount;
								if (isActiveRequest) {
									activeRequestIndex = index;
								}
								matchCount++;
								return (
									<Request
										maxStatusSize={maxStatusSize}
										maxMethodSize={maxMethodSize}
										maxEndpointSize={maxEndpointSize}
										store={messageStore}
										key={seqNum}
										isActive={isActiveRequest}
										highlight={seqNum === messageQueueStore.getHighlightSeqNum()}
										onClick={() => setClickPendingSeqNum(seqNum)}
										onResend={() => handleResend(message)}
										vertical={vertical}
										isFiltered={isFiltered}
										className={message.protocol === 'log:' && matchCount % 2 === 0 ? 'request__msg-even' : ''}
									/>);
							}
						})}
						{matchCount === 0 && (
							<div className="center">
								No matching request or response found.  Adjust your filter criteria.
							</div>
						)}
						{updateScroll()}
						{checkForScrollTo()}
					</div>
				}
				{messageQueueStore.getMessages().length === 0 &&
					<div className="request__container unselected"
						style={{ width: layout.calcMaxWidth(), height: layout.calcMaxHeight() }}
					>
						<div className="center fas fa-exchange-alt"
							style={{ fontSize: '8rem', color: '#007bff' }}>
						</div>
					</div>
				}
				{
					messageQueueStore.getMessages().length > 0 &&
					<div className="response__container"
						style={{ width: responseContainerLayout.width, height: responseContainerLayout.height }}
					>
						{activeRequestIndex < messageQueueStore.getMessages().length ?
							<Response
								store={messageQueueStore.getMessages()[activeRequestIndex]}
								message={messageQueueStore.getMessages()[activeRequestIndex].getMessage()}
								vertical={layout.isVertical()}
								onSync={() => messageQueueStore.setScrollToSeqNum(selectedReqSeqNum)}
								onClose={() => {
									handleClick(selectedReqSeqNum);
								}}
							/>
							:
							<Fade in={true}>
								<>
									<IconButton style={{ marginRight: '.5rem' }} onClick={() => {
										setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
									}} title="Close">
										<CloseIcon />
									</IconButton>
									<div className="center">
										{filterStore.getFilter().length > 0 ? 'Request is filtered' : 'Select request from left column'}
									</div>
								</>
							</Fade>
						}
					</div>
				}
				{
					resendStore ? (
						<ResendModal
							open={resendStore !== undefined}
							onClose={handleResendClose}
							store={resendStore}
						/>
					) : null}
				{
					messageStore !== null &&
					<BreakpointResponseModal
						open={breakpointStore.getMessageStore() !== null}
						onClose={handleCloseBreakpointResponseModal}
						store={messageStore}
					/>
				}
			</div >
		</div >
	);

	function handleResend(message: Message) {
		messageQueueStore.setFreeze(true);
		setResendStore(new ResendStore(message));
	}

	function handleResendClose() {
		messageQueueStore.setFreeze(false);
		setResendStore(undefined);
	}

	function handleCloseBreakpointResponseModal() {
		breakpointStore.closeBreakpointResponseModal();
	}

	function handleClick(seqNum: number) {
		snapshotStore.setUpdating(true, '');
		setTimeout(() => {
			const curSeqNum = selectedReqSeqNum;
			setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
			if (seqNum !== curSeqNum) {
				setSelectedReqSeqNum(seqNum);
				messageQueueStore.setHighlightSeqNum(seqNum);
				messageQueueStore.setScrollToSeqNum(seqNum);
			} else {
				messageQueueStore.setScrollToSeqNum(seqNum);
			}
			snapshotStore.setUpdating(false);
		});
	}

	function handleScroll() {
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			setScrollTop(parent.scrollTop);
			// If the last message is visible, we need setFreeze(false) to cause
			// all queued messages to be merged into the message queue, and become
			// visible.
			setTimeout(() => {
				const parent = (requestContainerRef.current as Element);
				if (parent && parent.childNodes.length > 0) {
					const children = parent.childNodes;
					let i = messageQueueStore.getMessages().length - 1;
					i = Math.max(0, i - 1);
					const element = (children[i] as Element);
					if (element) {
						const top = element.getBoundingClientRect().top;
						if (top <= 800) {
							messageQueueStore.setFreeze(false);
							setTimeout(handleScroll, 1000);
						}
					}
				}
			});
		}
	}

	function restoreScrollTop() {
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			parent.scrollTop = scrollTop;
		}
	}

	function doScrollTo(seqNum: number, delay: number = 0): boolean {
		if (seqNum !== Number.MAX_SAFE_INTEGER) {
			let offset = 0;
			setTimeout(() => {
				const parent = (requestContainerRef.current as Element);
				if (parent && parent.childNodes.length > 0) {
					const children = parent.childNodes;
					let elementIndex = 0;
					let entryHeight = 0;
					for (let i = 0; i < Math.min(messageQueueStore.getMessages().length, parent.childNodes.length); ++i) {
						const msg = messageQueueStore.getMessages()[i].getMessage();
						if (filterStore.isFiltered(messageQueueStore.getMessages()[i])) continue;
						const element = (children[elementIndex] as Element);
						if (msg.sequenceNumber === seqNum) {
							entryHeight = element.clientHeight;
							break;
						}
						offset += element.clientHeight;
						++elementIndex;
					}
					// if (offset > 0) {
					// 	offset += snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName()).length > 0 ? JSONFieldButtonsHeight : 0;
					// }
					if ((offset < parent.scrollTop || // above
						offset + entryHeight > parent.scrollTop + parent.clientHeight) // below
					) {
						parent.scrollTop = offset;
						//setScrollTop(offset);
					}
				}
			}, delay);
		}
		return true;
	}

	function calcRenderCount(scrollTop: number): number {
		let renderCount = Number.MAX_SAFE_INTEGER;
		const parent = (requestContainerRef.current as Element);
		const height = parent ? parent.clientHeight : window.innerHeight;
		const top = parent ? parent.scrollTop : scrollTop;
		const scrollBottom = top + (height * 2);
		renderCount = scrollBottom / minEntryHeight;
		renderCount = Math.floor(renderCount);
		return renderCount;
	}
});

export default SnapshotTabContent;