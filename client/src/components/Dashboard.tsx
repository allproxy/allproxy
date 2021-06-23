import React from 'react';
import { observer } from 'mobx-react-lite';
import { filterStore } from '../store/FilterStore';
import MessageQueueStore from '../store/MessageQueueStore';
import { Fade } from '@material-ui/core';
import Request from './Request';
import Response from './Response';
import ResendModal from './ResendModal';
import ResendStore from '../store/ResendStore';
import Message from '../common/Message';

type Props = {
	messageQueueStore: MessageQueueStore
}
const Dashboard = observer(({ messageQueueStore }: Props) => {
	const [activeRequestSeqNum, setActiveRequestSeqNum] = React.useState(Number.MAX_SAFE_INTEGER);
	const [openModal, setOpenModal] = React.useState(false);
	const [resendMessage, setResendMessage] = React.useState<Message>();
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			if (activeRequestSeqNum !== Number.MAX_SAFE_INTEGER) {
				setScrollTo(activeRequestSeqNum);
			}
		}
	});

	let activeRequestIndex = Number.MAX_SAFE_INTEGER;
	return (
		<div className="request-response__container">
			<div className="request__container" ref={ ref }>
				{messageQueueStore.getMessages().map((messageStore, index) => {
					if (filterStore.isFiltered(messageStore)) {
						return null;
					} else {
						const isActiveRequest = activeRequestSeqNum === messageStore.getMessage().sequenceNumber;
						if (isActiveRequest) {
							activeRequestIndex = index;
						}
						return (
							<Request store={messageStore}
								key={index}
								isActive={isActiveRequest}
								onClick={() => handleClick(index)}
								onResend={() => {
									if (messageStore.getMessage().protocol === 'http:' || messageStore.getMessage().protocol === 'https:') {
										setResendMessage(messageStore.getMessage());
										setOpenModal(true);
									}
								}}
							/>)
					}
				})}
			</div>
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

	function handleClick(index: number) {
		const curSeqNum = activeRequestSeqNum;
		setActiveRequestSeqNum(Number.MAX_SAFE_INTEGER);
		setTimeout(() => {
			const clickedSeqNum = messageQueueStore.getMessages()[index].getMessage().sequenceNumber;
			if (curSeqNum !== clickedSeqNum) {
				setActiveRequestSeqNum(clickedSeqNum);
			}
		});
	}

	function setScrollTo(seqNum: number) {
		if (seqNum !== Number.MAX_SAFE_INTEGER) {
			let offset = 0;
			const parent = (ref.current as Element);
			const children = (parent).childNodes;
			for (let i = 0; i < messageQueueStore.getMessages().length; ++i) {
				if (messageQueueStore.getMessages()[i].getMessage().sequenceNumber === seqNum) {
					break;
				}
				const element = (children[i] as Element);
				offset += element.clientHeight;
			}
			parent.scrollTop = offset;
		}
	}
});

export default Dashboard;