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
	messageQueueStore: MessageQueueStore
}
const SnapshotTabContent = observer(({ messageQueueStore }: Props) => {
	const [activeRequestSeqNum, setActiveRequestSeqNum] = React.useState(Number.MAX_SAFE_INTEGER);
	const [openModal, setOpenModal] = React.useState(false);
	const [resendMessage, setResendMessage] = React.useState<Message>();
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			if (activeRequestSeqNum !== Number.MAX_SAFE_INTEGER) {
				console.log('reset scroll');
				setScrollTo(activeRequestSeqNum);
			}
		} else if (messageQueueStore.getAutoScroll()) {
			if (activeRequestSeqNum === Number.MAX_SAFE_INTEGER) {
				const messages = messageQueueStore.getMessages();
				const lastMessage = messages[messages.length - 1];
				if (lastMessage) {
					console.log('auto scroll set scroll');
					setScrollTo(lastMessage.getMessage().sequenceNumber);
				}
			}
		}
	});

	let maxElapsedTime = 0;
	messageQueueStore.getMessages()
		.forEach(messageStore => {
			const et = messageStore.getMessage().elapsedTime ? messageStore.getMessage().elapsedTime : 0;
			maxElapsedTime = Math.max(maxElapsedTime, et);
		});

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	return (
		<div className="request-response__container">
			{messageQueueStore.getMessages().length > 0 &&
				<div className="request__container" ref={ref}>
					{messageQueueStore.getMessages().map((messageStore, index) => {
						if (filterStore.isFiltered(messageStore)) {
							return null;
						} else {
							const message = messageStore.getMessage();
							const seqNum = message.sequenceNumber;
							const isActiveRequest = activeRequestSeqNum === seqNum;
							if (isActiveRequest) {
								activeRequestIndex = index;
							}
							const timeBarPercent = maxElapsedTime > 0
								? (message.elapsedTime ? ((message.elapsedTime * 100) / maxElapsedTime) : 1)
								: 0;
							return (
								<Request store={messageStore}
									key={seqNum}
									isActive={isActiveRequest}
									timeBarPercent={timeBarPercent + '%'}
									onClick={() => handleClick(seqNum)}
									onResend={() => {
										if (message.protocol === 'http:' || message.protocol === 'https:') {
											setResendMessage(message);
											setOpenModal(true);
										}
									}}
								/>)
						}
					})}
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
			{resendMessage ? (
				<ResendModal
					open={openModal}
					onClose={() => setOpenModal(false)}
					store={new ResendStore(resendMessage)}
				/>
			) : null}
		</div>
	);

	function handleClick(seqNum: number) {
		const curSeqNum = activeRequestSeqNum;
		setActiveRequestSeqNum(Number.MAX_SAFE_INTEGER);
		if (seqNum !== curSeqNum) {
			setActiveRequestSeqNum(seqNum);
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