import React from 'react';
import { observer } from 'mobx-react-lite';
import { filterStore } from '../store/FilterStore';
import MessageQueueStore from '../store/MessageQueueStore';
import { CircularProgress, Fade } from '@material-ui/core';
import Request from './Request';
import Response from './Response';
import ResendModal from './ResendModal';
import ResendStore from '../store/ResendStore';
import Message from '../common/Message';

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
	const [openModal, setOpenModal] = React.useState(false);
	const [resendStore, setResendStore] = React.useState<ResendStore>();

	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			if (selectedReqSeqNum !== Number.MAX_SAFE_INTEGER) {
				setScrollTo(selectedReqSeqNum);
			}
		} else if (messageQueueStore.getAutoScroll()) {
			if (selectedReqSeqNum === Number.MAX_SAFE_INTEGER) {
				const messages = messageQueueStore.getMessages();
				const lastMessage = messages[messages.length - 1];
				if (lastMessage) {
					setScrollTo(lastMessage.getMessage().sequenceNumber);
				}
			}
		} else {
			restoreScrollTop();
		}
	});

	let maxElapsedTime = 0;
	messageQueueStore.getMessages()
		.forEach(messageStore => {
			const et = messageStore.getMessage().elapsedTime ? messageStore.getMessage().elapsedTime : 0;
			maxElapsedTime = Math.max(maxElapsedTime, et);
		});

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	let matchCount = 0;
	return (
		<div className="request-response__container">
			{messageQueueStore.getMessages().length > 0 &&
				<div className={'request__container ' + (selectedReqSeqNum === Number.MAX_SAFE_INTEGER ? 'unselected' : '')}
					ref={ref} onScroll={handleScroll}>
					{messageQueueStore.getMessages().map((messageStore, index) => {
						if (filterStore.isFiltered(messageStore)) {
							return null;
						} else {
							const message = messageStore.getMessage();
							const seqNum = message.sequenceNumber;
							const isActiveRequest = selectedReqSeqNum === seqNum;
							if (isActiveRequest) {
								activeRequestIndex = index;
							}
							matchCount++;
							const timeBarPercent = maxElapsedTime > 0
								? (message.elapsedTime ? ((message.elapsedTime * 100) / maxElapsedTime) : 1)
								: 0;
							return (
								<Request
									store={messageStore}
									key={seqNum}
									isActive={isActiveRequest}
									timeBarPercent={timeBarPercent + '%'}
									onClick={handleClick.bind(null, seqNum)}
									onResend={() => handleResend(message)}
								/>)
						}
					})}
					{matchCount === 0 && (
						<div className="center">
							No matching request or response found.  Adjust your filter criteria.
						</div>
					)}
				</div>
			}
			{messageQueueStore.getMessages().length === 0 &&
				<div className="request__container">
					<CircularProgress className="center" />
				</div>
			}
			<div className="response__container">
				{activeRequestIndex < messageQueueStore.getMessages().length ?
					<Response
						store={messageQueueStore.getMessages()[activeRequestIndex]}
						message={messageQueueStore.getMessages()[activeRequestIndex].getMessage()}
					/>
					:
					<Fade in={true}>
						<div className="center">
							Select request from left column
						</div>
					</Fade>
				}
			</div>
			{resendStore ? (
				<ResendModal
					open={openModal}
					onClose={() => setOpenModal(false)}
					store={resendStore}
				/>
			) : null}
		</div>
	);

	function handleClick(seqNum: number) {
		const curSeqNum = selectedReqSeqNum;
		setSelectedReqSeqNum(Number.MAX_SAFE_INTEGER);
		if (seqNum !== curSeqNum) {
			setSelectedReqSeqNum(seqNum);
		}
	}

	function handleScroll() {
		const parent = (ref.current as Element);
		if (parent && parent.childNodes.length > 0) {
			setScrollTop(parent.scrollTop);
		}
	}

	function handleResend(message: Message) {
		setResendStore(new ResendStore(message));
		setOpenModal(true);
	}

	function restoreScrollTop() {
		const parent = (ref.current as Element);
		if (parent && parent.childNodes.length > 0) {
			parent.scrollTop = scrollTop;
		}
	}

	function setScrollTo(seqNum: number) {
		if (seqNum !== Number.MAX_SAFE_INTEGER) {
			let offset = 0;
			setTimeout(() => {
				const parent = (ref.current as Element);
				if (parent && parent.childNodes.length > 0) {
					const children = parent.childNodes;
					for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
						if (messageQueueStore.getMessages()[i].getMessage().sequenceNumber === seqNum) {
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