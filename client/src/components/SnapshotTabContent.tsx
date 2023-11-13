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
import MessageStore from '../store/MessageStore';

const minEntryHeight = 26;
const minRenderCount = 100;

let lastScrollTime = 0;

type Props = {
	messageQueueStore: MessageQueueStore,
	selectedReqSeqNum: number,
	setSelectedReqSeqNum: (seqNum: number) => void,
	scrollTop: number,
	setScrollTop: (index: number) => void,
	scrollTopIndex: number,
	setScrollTopIndex: (index: number) => void,
	highlightSeqNum: number,
	setHighlightSeqNum: (seqNum: number) => void,
}

const SnapshotTabContent = observer(({
	messageQueueStore, selectedReqSeqNum, setSelectedReqSeqNum, scrollTop, scrollTopIndex, setScrollTop, setScrollTopIndex,
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
		if (messageQueueStore.getScrollAction() !== undefined) {
			if (renderSet.length > 0) {
				switch (messageQueueStore.getScrollAction()) {
					case 'top': {
						let firstSeqNum = 0;
						for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
							const messageStore = messageQueueStore.getMessages()[i];
							if (!messageStore.isFiltered()) {
								firstSeqNum = messageStore.getMessage().sequenceNumber;
								setScrollTopIndex(i);
								break;
							}
						}
						messageQueueStore.setScrollToSeqNum(firstSeqNum);
						setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
						setHighlightSeqNum(firstSeqNum);
						break;
					}
					case 'bottom': {
						let lastSeqNum = 0;
						let stIndex = 0;
						let back = 0;
						for (let i = messageQueueStore.getMessages().length - 1; i >= 0; --i) {
							const messageStore = messageQueueStore.getMessages()[i];
							if (!messageStore.isFiltered()) {
								if (lastSeqNum === 0) {
									lastSeqNum = messageStore.getMessage().sequenceNumber;
								}
								if (++back === renderCount) {
									break;
								}
								stIndex = i;
							}
						}
						setScrollTopIndex(stIndex);
						messageQueueStore.setScrollToSeqNum(lastSeqNum);
						setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
						setHighlightSeqNum(lastSeqNum);
						break;
					}
					case 'pageup': {
						let lastSeqNum = 0;
						let stIndex = 0;
						let back = 0;
						for (let i = renderSet[0].getIndex(); i >= 0; --i) {
							const messageStore = messageQueueStore.getMessages()[i];
							if (!messageStore.isFiltered()) {
								if (lastSeqNum === 0) {
									lastSeqNum = messageStore.getMessage().sequenceNumber;
								}
								if (++back === 4) {
									break;
								}
								stIndex = i;
							}
						}
						if (stIndex !== renderSet[0].getIndex()) {
							setScrollTopIndex(stIndex);
							messageQueueStore.setScrollToSeqNum(lastSeqNum);
						}
						break;
					}
					case 'pagedown': {
						let end = renderSet[renderSet.length - 1];
						let more = false;
						for (let i = end.getIndex() + 1; i < messageQueueStore.getMessages().length; ++i) {
							const messageStore = messageQueueStore.getMessages()[i];
							if (!messageStore.isFiltered()) {
								more = true;
								break;
							}
						}
						if (more) {
							setScrollTopIndex(end.getIndex());
							messageQueueStore.setScrollToSeqNum(end.getMessage().sequenceNumber);
						}
						break;
					}
				}
			}
			messageQueueStore.setScrollAction(undefined);
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
				doScrollTo(seqNum, 0);
				messageQueueStore.setHighlightSeqNum(seqNum);
			}
		}
	}

	function calcRenderCount(): number {
		let renderCount;
		const parent = (requestContainerRef.current as Element);
		let height = parent ? parent.clientHeight : window.innerHeight;
		height *= 2;
		renderCount = height / minEntryHeight;
		renderCount = Math.floor(renderCount);
		return Math.max(renderCount, minRenderCount);
	}

	let renderCount = calcRenderCount();

	let renderSet: MessageStore[] = [];
	let maxStatusSize = 0;
	let maxMethodSize = 0;
	let maxEndpointSize = 0;

	let activeReqSeqNumAdded = false;
	const startIndex = messageQueueStore.getFullPageSearch() ? 0 : scrollTopIndex;
	for (let i = startIndex; i < messageQueueStore.getMessages().length; ++i) {
		const messageStore = messageQueueStore.getMessages()[i];
		messageStore.setIndex(i);
		maxStatusSize = Math.max(maxStatusSize, (messageStore.getMessage().status + '').length);
		const method = messageStore.getMessage().method;
		maxMethodSize = Math.max(maxMethodSize, method ? method.length : 0);
		maxEndpointSize = Math.max(maxEndpointSize, messageStore.getMessage().endpoint.length);

		const message = messageStore.getMessage();
		const seqNum = message.sequenceNumber;
		const isActiveRequest = selectedReqSeqNum === seqNum;
		const isFiltered = messageStore.isFiltered() || renderSet.length >= renderCount && !messageQueueStore.getFullPageSearch();
		if (isActiveRequest || !isFiltered) {
			renderSet.push(messageStore);
		}
		if (isActiveRequest) activeReqSeqNumAdded = true;
	}

	if (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER && !activeReqSeqNumAdded) {
		for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
			const messageStore = messageQueueStore.getMessages()[i];
			if (selectedReqSeqNum === messageStore.getMessage().sequenceNumber) {
				renderSet.push(messageStore);
				break;
			}
		}
	}

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	let layout = snapshotStore.getLayout(snapshotStore.getSelectedSnapshotName());
	if (layout === undefined) layout = new LayoutStore();
	const vertical = layout.isVertical();
	const requestContainerLayout = layout.requestContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);
	const responseContainerLayout = layout.responseContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);

	return (
		<div style={{
			opacity: clickPendingSeqNum !== Number.MAX_SAFE_INTEGER || messageQueueStore.getScrollAction() !== undefined ? '.7' : snapshotStore.isUpdating() ? '.3' : undefined
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
						ref={requestContainerRef} onWheel={handleScroll}>
						{renderSet.map((messageStore, index) => {
							const message = messageStore.getMessage();
							const seqNum = message.sequenceNumber;
							const isActiveRequest = selectedReqSeqNum === seqNum;

							if (isActiveRequest) {
								activeRequestIndex = index;
							}
							return (
								<>
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
										isFiltered={messageStore.isFiltered()}
										className={message.protocol === 'log:' && index % 2 === 0 ? 'request__msg-even' : ''}
									/>
								</>
							);
						})}
						{renderSet.length === 0 && (
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
			setHighlightSeqNum(seqNum);
			snapshotStore.setUpdating(false);
		});
	}

	function handleScroll(e: any) {
		const up = e.deltaY < 0;
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			const bottom = endOfScroll() - parent.clientHeight;
			//console.log(parent.scrollTop, scrollTop, bottom, renderSet[0].getIndex());
			if (messageQueueStore.getScrollAction() === undefined) {
				const now = Date.now();
				const elapsed = now - lastScrollTime;
				if (elapsed > 1000) {
					lastScrollTime = now;
					if (up && parent.scrollTop === 0 && scrollTop === 0 && renderSet[0].getIndex() > 0) {
						messageQueueStore.setScrollAction('pageup');
					} else if (!up && parent.scrollTop + 1 >= bottom && parent.scrollTop === scrollTop && renderSet[renderSet.length - 1].getIndex() < messageQueueStore.getMessages().length - 1) {
						messageQueueStore.setScrollAction('pagedown');
					}
				}
			}

			setScrollTop(parent.scrollTop);
		}
	}

	function restoreScrollTop() {
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			parent.scrollTop = scrollTop;
		}
	}

	function endOfScroll(): number {
		let offset = 0;
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			const children = parent.childNodes;
			for (let i = 0; i < renderSet.length; ++i) {
				const element = (children[i] as Element);
				if (!element) break;
				offset += element.clientHeight;
			}
			return offset;
		}
		return 0;
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
					for (const messageStore of renderSet) {
						const message = messageStore.getMessage();
						const element = (children[elementIndex] as Element);
						if (!element) return false;
						if (message.sequenceNumber === seqNum) {
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
						setScrollTop(offset);
					}
				}
			}, delay);
		}
		return true;
	}
});

export default SnapshotTabContent;