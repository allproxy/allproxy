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
import { mainTabStore } from '../store/MainTabStore';
import CloseIcon from "@material-ui/icons/Close";
import LayoutStore from '../store/LayoutStore';
import MessageStore from '../store/MessageStore';
import { queryStore } from '../store/QueryStore';

const minEntryHeight = 26;
export const minRenderCount = 100;

let lastScrollTime = 0;

type Props = {
	messageQueueStore: MessageQueueStore,
	selectedReqSeqNum: number,
	setSelectedReqSeqNum: (seqNum: number) => void,
	scrollTop: number,
	setScrollTop: (index: number) => void,
	scrollTopDetails: number,
	setScrollTopDetails: (index: number) => void,
	renderSetTopIndex: number,
	setRenderSetTopIndex: (index: number) => void,
	highlightSeqNum: number,
	setHighlightSeqNum: (seqNum: number) => void,
}

const MainTabContent = observer(({
	messageQueueStore, selectedReqSeqNum, setSelectedReqSeqNum, scrollTop, renderSetTopIndex, setScrollTop, scrollTopDetails, setScrollTopDetails, setRenderSetTopIndex,
	highlightSeqNum, setHighlightSeqNum
}: Props) => {
	const [resendStore, setResendStore] = React.useState<ResendStore>();
	const [clickPendingSeqNum, setClickPendingSeqNum] = React.useState(Number.MAX_SAFE_INTEGER);

	const messageStore = breakpointStore.getMessageStore();

	const requestContainerRef = React.useRef<HTMLDivElement>(null);
	const responseContainerRef = React.useRef<HTMLDivElement>(null);

	React.useLayoutEffect(() => {
		messageQueueStore.setHighlightSeqNum(highlightSeqNum);
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
								setRenderSetTopIndex(i);
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
						// allow time to complete render
						setTimeout(() => {
							setRenderSetTopIndex(stIndex);
							messageQueueStore.setScrollToSeqNum(lastSeqNum);
							setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
							setHighlightSeqNum(lastSeqNum);
						});
						break;
					}
					case 'pageup': {
						doPageUp();
						break;
					}
					case 'pagedown': {
						doPageDown();
						break;
					}
					case 'filter': {
						setTimeout(() => doFilterAction());
						break;
					}
				}
			}
			messageQueueStore.setScrollAction(undefined);
		}
	});

	function checkForScrollTo() {
		const seqNum = messageQueueStore.getScrollToSeqNum();
		if (seqNum !== null) {
			messageQueueStore.setScrollToSeqNum(null);
			doScrollTo(seqNum);
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

	let selectedReqSeqNumAdded = false;
	let startIndex = messageQueueStore.getFullPageSearch() ? 0 : renderSetTopIndex;
	for (; ;) {
		for (let i = startIndex; i < messageQueueStore.getMessages().length; ++i) {
			const messageStore = messageQueueStore.getMessages()[i];
			messageStore.setIndex(i);
			maxStatusSize = Math.max(maxStatusSize, (messageStore.getMessage().status + '').length);
			const method = messageStore.getMessage().method;
			maxMethodSize = Math.max(maxMethodSize, method ? method.length : 0);
			maxEndpointSize = Math.max(maxEndpointSize, messageStore.getMessage().endpoint.length);

			const message = messageStore.getMessage();
			const seqNum = message.sequenceNumber;
			const isSelectedRequest = selectedReqSeqNum === seqNum;
			const isFiltered = messageStore.isFiltered() || renderSet.length >= renderCount && !messageQueueStore.getFullPageSearch();
			if (isSelectedRequest || !isFiltered) {
				renderSet.push(messageStore);
			}
			if (isSelectedRequest) selectedReqSeqNumAdded = true;
		}

		// If the render set is not full, a filter is set and we did start at the top?
		if (renderSet.length < renderCount - 1 && filterStore.getFilter().length > 0 && startIndex > 0) {
			//console.log(renderSet.length, renderCount, startIndex);
			startIndex = 0; // Restart from the top
			renderSet = [];
			continue;
		}
		break;
	}

	// Always add the currently selected request
	if (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER && !selectedReqSeqNumAdded) {
		for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
			const messageStore = messageQueueStore.getMessages()[i];
			if (selectedReqSeqNum === messageStore.getMessage().sequenceNumber) {
				if (renderSet.length > 0 && messageStore.getIndex() < renderSet[0].getIndex()) {
					renderSet.unshift(messageStore);
				} else {
					renderSet.push(messageStore);
				}
				break;
			}
		}
	}

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	let layout = mainTabStore.getLayout(mainTabStore.getSelectedTabName());
	if (layout === undefined) layout = new LayoutStore();
	const vertical = layout.isVertical();
	const requestContainerLayout = layout.requestContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);
	const responseContainerLayout = layout.responseContainer(selectedReqSeqNum === Number.MAX_SAFE_INTEGER);

	return (
		<div style={{
			opacity: clickPendingSeqNum !== Number.MAX_SAFE_INTEGER || messageQueueStore.getScrollAction() !== undefined ? '.7' : mainTabStore.isUpdating() ? '.3' : undefined
		}}>
			<div className="request-response__container"
				style={{ flexDirection: layout.flexDirection() }}
			>
				{
					messageQueueStore.getMessages().length > 0 &&
					<div className={'request__container '
						+ (selectedReqSeqNum === Number.MAX_SAFE_INTEGER ? 'unselected' : '')}
						style={{
							resize: layout.isVertical() ? 'horizontal' : 'vertical',
							width: requestContainerLayout.width,
							height: requestContainerLayout.height
						}}
						ref={requestContainerRef} onWheel={handleScroll}>
						<>
							{renderSet.map((messageStore, index) => {
								const message = messageStore.getMessage();
								const seqNum = message.sequenceNumber;
								const isSelectedRequest = selectedReqSeqNum === seqNum;

								if (isSelectedRequest) {
									activeRequestIndex = messageStore.getIndex();
								}

								if (message.protocol === 'log:' &&
									(index === 1 || seqNum === messageQueueStore.getHighlightSeqNum())
								) {
									const jsonFields: string[] = [];
									const jsonFieldsMap = messageStore.getAllJsonFieldsMap();
									for (const key in jsonFieldsMap) {
										const name = jsonFieldsMap[key].name;
										if (!name.includes(" ")) {
											jsonFields.push(name);
										}
									}
									queryStore.setAddionalQueries(jsonFields);
								}

								return (
									<Request
										maxStatusSize={maxStatusSize}
										maxMethodSize={maxMethodSize}
										maxEndpointSize={maxEndpointSize}
										store={messageStore}
										key={seqNum}
										isActive={isSelectedRequest}
										highlight={seqNum === messageQueueStore.getHighlightSeqNum()}
										onClick={() => setClickPendingSeqNum(seqNum)}
										onResend={() => handleResend(message)}
										onDelete={() => messageQueueStore.getMessages().splice(renderSet[index].getIndex(), 1)}
										vertical={vertical}
										isFiltered={messageStore.isFiltered()}
										className={message.protocol === 'log:' && index % 2 === 0 ? 'request__msg-even' : ''}
										doHighlight={() => {
											setHighlightSeqNum(seqNum);
											if (seqNum !== selectedReqSeqNum) {
												setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
											}
										}
										}
									/>
								);
							})}
							{renderSet.length === 0 && (
								<div className="center">
									No matching request or response found.  Adjust your filter criteria.
								</div>
							)}
							{restoreScrollTop()}
							{checkForScrollTo()}
						</>
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
				{messageQueueStore.getMessages().length > 0 && !vertical && <div style={{ background: '#007bff', height: '0.1rem', marginRight: '4rem' }}></div>}
				{
					messageQueueStore.getMessages().length > 0 &&
					<div className="response__container"
						ref={responseContainerRef} onWheel={handleScrollDetails}
						style={{
							width: responseContainerLayout.width,
							height: responseContainerLayout.height
						}}
					>
						{activeRequestIndex < messageQueueStore.getMessages().length ?
							<Response
								store={messageQueueStore.getMessages()[activeRequestIndex]}
								message={messageQueueStore.getMessages()[activeRequestIndex].getMessage()}
								vertical={layout.isVertical()}
								onSync={() => messageQueueStore.setScrollToSeqNum(selectedReqSeqNum)}
								onClose={() => {
									setClickPendingSeqNum(selectedReqSeqNum);
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
		setResendStore(new ResendStore(message));
	}

	function handleResendClose() {
		setResendStore(undefined);
	}

	function handleCloseBreakpointResponseModal() {
		breakpointStore.closeBreakpointResponseModal();
	}

	function handleClick(seqNum: number) {
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
		});
	}

	function handleScrollDetails() {
		const parent = (responseContainerRef.current as Element);
		setScrollTopDetails(parent.scrollTop);
	}

	function handleScroll(e: any) {
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			const up = e.deltaY < 0;
			const scrollBottom = findScrollBottom();
			//console.log(up, parent.scrollTop + parent.clientHeight + minEntryHeight, scrollBottom);
			if (messageQueueStore.getScrollAction() === undefined) {
				const now = Date.now();
				const elapsed = now - lastScrollTime;
				if (elapsed > 1000) {
					if (up && parent.scrollTop === 0 && scrollTop === 0 && renderSet[0].getIndex() > 0) {
						for (let i = renderSet[0].getIndex() - 1; i >= 0; --i) {
							if (!messageQueueStore.getMessages()[i].isFiltered()) {
								lastScrollTime = now;
								messageQueueStore.setScrollAction('pageup');
								break;
							}
						}
					} else if (!up &&
						parent.scrollTop + parent.clientHeight + minEntryHeight >= scrollBottom &&
						renderSet[renderSet.length - 1].getIndex() < messageQueueStore.getMessages().length - 1) {
						for (let i = renderSet[renderSet.length - 1].getIndex() + 1; i < messageQueueStore.getMessages().length; ++i) {
							if (!messageQueueStore.getMessages()[i].isFiltered()) {
								lastScrollTime = now;
								messageQueueStore.setScrollAction('pagedown');
								break;
							}
						}
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

		if (activeRequestIndex < messageQueueStore.getMessages().length) {
			const parent = (responseContainerRef.current as Element);
			if (parent && parent.scrollTop !== scrollTopDetails) {
				setTimeout(() => parent.scrollTop = scrollTopDetails);
			}
		}
	}

	function doPageDown() {
		const bottom = findScrollBottom();
		let offset = 0;
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.childNodes.length > 0) {
			const children = parent.childNodes;
			for (let i = 0; i < renderSet.length; ++i) {
				let element = (children[i] as Element);
				if (!element) break;
				//console.log('pagedown', parent.scrollTop, offset);
				if (offset >= parent.scrollTop || offset + parent.clientHeight >= bottom) {
					const seqNum = messageQueueStore.getMessages()[renderSet[i].getIndex()].getMessage().sequenceNumber;
					messageQueueStore.setScrollToSeqNum(seqNum);

					let stIndex = i;
					let j = 0;
					for (j = 0; j < Math.round(renderSet.length / 2); ++j) {
						element = (children[stIndex--] as Element);
						if (!element) break;
					}
					if (j % 2 !== stIndex % 2) stIndex--;
					setRenderSetTopIndex(renderSet[stIndex].getIndex());
					break;
				}

				offset += element.clientHeight;
			}
		}
	}

	function doPageUp() {
		const parent = (requestContainerRef.current as Element);
		if (parent && parent.scrollTop === 0 && scrollTop === 0 && renderSet[0].getIndex() > 0) {
			let stSeqNum = 0;
			let stIndex = 0;
			let backup = 1;
			let i: number;
			for (i = renderSet[0].getIndex(); i >= 0; --i) {
				const messageStore = messageQueueStore.getMessages()[i];
				if (!messageStore.isFiltered()) {
					if (stSeqNum === 0) {
						stSeqNum = messageStore.getMessage().sequenceNumber;
					}
					if (++backup === Math.round(renderSet.length / 2)) {
						break;
					}
					stIndex = i;
				}
			}
			if (stIndex !== 0 && i % 2 !== stIndex % 2) stIndex++;
			if (stIndex !== renderSet[0].getIndex()) {
				setRenderSetTopIndex(stIndex);
				messageQueueStore.setScrollToSeqNum(stSeqNum);
			}
		}
	}

	function doFilterAction() {

		setScrollTop(0);
		setRenderSetTopIndex(0);

		for (const messageStore of messageQueueStore.getMessages()) {
			if (messageQueueStore.getHighlightSeqNum() === messageStore.getMessage().sequenceNumber) {
				let backup = 1;
				let stIndex = messageStore.getIndex();
				for (let i = messageStore.getIndex(); i >= 0; --i) {
					const messageStore = messageQueueStore.getMessages()[i];
					if (!messageStore.isFiltered()) {
						if (++backup === Math.round(minRenderCount / 2)) {
							break;
						}
						stIndex = i;
					}
				}
				setRenderSetTopIndex(stIndex);
				messageQueueStore.setScrollToSeqNum(messageQueueStore.getHighlightSeqNum());
			}
		}
	}

	function findScrollBottom(): number {
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

	function doScrollTo(seqNum: number): boolean {
		if (seqNum !== Number.MAX_SAFE_INTEGER) {
			let scrollChanged = false;
			let offset = 0;
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

				// Not in viewport?
				if (offset < parent.scrollTop // above
					|| offset + entryHeight > parent.scrollTop + parent.clientHeight // below
				) {
					let belowSize = 0;
					for (let i = elementIndex + 1; i < renderSet.length; ++i) {
						const element = (children[i] as Element);
						if (!element) break;
						belowSize += element.clientHeight;
					}
					// Place entry at bottom?
					if (belowSize < parent.clientHeight - entryHeight || (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER && !vertical)) {
						offset -= (parent.clientHeight - entryHeight);
					}

					parent.scrollTop = offset;
					setScrollTop(offset);
					scrollChanged = true;
				}
			}

			if (scrollChanged) {
				setTimeout(() => {
					parent.scrollTop = offset;
					setScrollTop(offset);
				});
			}
		}
		return true;
	}
});

export default MainTabContent;