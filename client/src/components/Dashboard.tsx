import React from 'react';
import { observer } from 'mobx-react-lite';
import { filterStore } from '../store/FilterStore';
import MessageQueueStore from '../store/MessageQueueStore';
import Request from './Request';
import Response from './Response';
import ResendModal from './ResendModal';
import ResendStore from '../store/ResendStore';
import Message from '../common/Message';

type Props = {
	messageQueueStore: MessageQueueStore
}
const Dashboard = observer(({ messageQueueStore }: Props) => {
	const [activeRequestIndex, setActiveRequestIndex] = React.useState(Number.MAX_SAFE_INTEGER);
	const [openModal, setOpenModal] = React.useState(false);
	const [resendMessage, setResendMessage] = React.useState<Message>();
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (activeRequestIndex !== Number.MAX_SAFE_INTEGER
			&& activeRequestIndex >= messageQueueStore.getMessages().length) {
			setActiveRequestIndex(Number.MAX_SAFE_INTEGER);
		} else if (filterStore.shouldResetScroll()) {
			filterStore.setResetScroll(false);
			resetScroll(activeRequestIndex);
		}
	});

	return (
		<div className="request-response__container">
			<div className="request__container" ref={ ref }>
				{messageQueueStore.getMessages().map((messageStore, index) => {
					if (filterStore.isFiltered(messageStore)) {
						return null;
					} else {
						return (
							<Request store={messageStore}
								key={index}
								isActive={activeRequestIndex === index}
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
					: <div className="center">Select request from left column</div>}
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
		const curIndex = activeRequestIndex;
		setActiveRequestIndex(Number.MAX_SAFE_INTEGER);
		setTimeout(() => {
			if (curIndex !== index) {
				setActiveRequestIndex(index);
			}
		});
	}

	function resetScroll(index: number) {
		if (index !== Number.MAX_SAFE_INTEGER) {
			let offset = 0;
			const parent = (ref.current as Element);
			const children = (parent).childNodes;
			for (let i = 0; i < index; ++i) {
				const element = (children[i] as Element);
				offset += element.clientHeight
			}
			parent.scrollTop = offset;
		}
	}
});

export default Dashboard;