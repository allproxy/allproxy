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
import { Fade } from '@material-ui/core';
import JSONFieldButtons from './JSONFieldButtons';

type Props = {
	messageQueueStore: MessageQueueStore,
	selectedReqSeqNum: number,
	setSelectedReqSeqNum: (seqNum: number) => void,
	scrollTop: number,
	setScrollTop: (scrollTop: number) => void,
}
const SnapshotTabContent = observer(({
	messageQueueStore, selectedReqSeqNum, setSelectedReqSeqNum, scrollTop, setScrollTop
}: Props) => {
	const [resendStore, setResendStore] = React.useState<ResendStore>();

	const messageStore = breakpointStore.getMessageStore();

	let lastSeqNum = 0;

	const requestContainerRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			if (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER) {
				setScrollTo(selectedReqSeqNum);
			}
		} else {
			restoreScrollTop();
		}
	});

	const shouldShowTimeBar = (message: Message) => {
		if (message.protocol === 'log:') {
			const catFile = message.proxyConfig!.path && message.proxyConfig!.path.startsWith('cat ');
			return catFile;
		}
		return true;
	}

	let maxStatusSize = 0;
	let maxMethodSize = 0;
	let maxEndpointSize = 0;
	let maxElapsedTime = 0;
	messageQueueStore.getMessages()
		.forEach(messageStore => {
			maxStatusSize = Math.max(maxStatusSize, (messageStore.getMessage().status + '').length);
			const method = messageStore.getMessage().method;
			maxMethodSize = Math.max(maxMethodSize, method ? method.length : 0);
			maxEndpointSize = Math.max(maxEndpointSize, messageStore.getMessage().endpoint.length);
			if (!shouldShowTimeBar(messageStore.getMessage())) return;
			const et = messageStore.getMessage().elapsedTime ? messageStore.getMessage().elapsedTime : 0;
			maxElapsedTime = Math.max(maxElapsedTime, et);
		});

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	let matchCount = 0;

	const calcHeight = () => {
		const jsonFieldButtonsHeight = messageQueueStore.getJsonPrimaryFields().length > 0 ? '40px' : '-3rem';
		return `calc(100vh - 9rem - ${jsonFieldButtonsHeight})`
	};

	return (
		<div>
			<div>
				{JSONFieldButtons(messageQueueStore)}
			</div>
			<div className="request-response__container">
				{messageQueueStore.getMessages().length > 0 &&
					<div className={'request__container '
						+ (selectedReqSeqNum === Number.MAX_SAFE_INTEGER ? 'unselected' : '')}
						style={{ height: calcHeight() }}
						ref={requestContainerRef} onScroll={handleScroll}>
						{messageQueueStore.getMessages().map((messageStore, index) => {
							if (filterStore.isFiltered(messageStore)) {
								return null;
							} else {
								const message = messageStore.getMessage();
								const seqNum = message.sequenceNumber;
								lastSeqNum = seqNum;
								const isActiveRequest = selectedReqSeqNum === seqNum;
								if (isActiveRequest) {
									activeRequestIndex = index;
								}
								matchCount++;
								const timeBarPercent = maxElapsedTime > 0 && shouldShowTimeBar(message)
									? (message.elapsedTime ? ((message.elapsedTime * 100) / maxElapsedTime) : 1)
									: 0;
								return (
									<Request
										maxStatusSize={maxStatusSize}
										maxMethodSize={maxMethodSize}
										maxEndpointSize={maxEndpointSize}
										store={messageStore}
										key={seqNum}
										isActive={isActiveRequest}
										timeBarPercent={timeBarPercent + '%'}
										onClick={handleClick.bind(null, seqNum)}
										onResend={() => handleResend(message)}
									/>)
							}
						})}
						{matchCount > 0 && messageQueueStore.getAutoScroll() && selectedReqSeqNum === Number.MAX_SAFE_INTEGER && setScrollTo(lastSeqNum)}
						{matchCount === 0 && (
							<div className="center">
								No matching request or response found.  Adjust your filter criteria.
							</div>
						)}
					</div>
				}
				{messageQueueStore.getMessages().length === 0 &&
					<div className="request__container unselected" style={{ height: calcHeight() }}>
						<div className="center fas fa-exchange-alt"
							style={{ fontSize: '8rem', color: '#007bff' }}>
						</div>
					</div>
				}
				{
					messageQueueStore.getMessages().length > 0 &&
					<div className="response__container"
						style={{ height: calcHeight() }}
					>
						{activeRequestIndex < messageQueueStore.getMessages().length ?
							<Response
								store={messageQueueStore.getMessages()[activeRequestIndex]}
								message={messageQueueStore.getMessages()[activeRequestIndex].getMessage()}
								onClose={() => setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER)}
							/>
							:
							<Fade in={true}>
								<div className="center">
									Select request from left column
								</div>
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
		</div>
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
		const curSeqNum = selectedReqSeqNum;
		setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
		if (seqNum !== curSeqNum) {
			setSelectedReqSeqNum(seqNum);
		}
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

	function setScrollTo(seqNum: number) {
		if (seqNum !== Number.MAX_SAFE_INTEGER) {
			let offset = 0;
			setTimeout(() => {
				const parent = (requestContainerRef.current as Element);
				if (parent && parent.childNodes.length > 0) {
					const children = parent.childNodes;
					for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
						const msg = messageQueueStore.getMessages()[i].getMessage();
						if (msg.sequenceNumber === seqNum) {
							break;
						}
						const element = (children[i] as Element);
						if (element) {
							offset += element.clientHeight;
						}
					}
					parent.scrollTop = offset;
				}
			});
		}
	}
});

export default SnapshotTabContent;