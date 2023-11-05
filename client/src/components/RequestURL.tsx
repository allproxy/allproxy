import { observer } from 'mobx-react-lite';
import MessageStore from '../store/MessageStore';

type Props = {
	message: MessageStore,
};
const RequestURL = observer(({ message }: Props) => {
	return (
		<div>
			{makeUrl(message).map((element) => {
				return element;
			})}
		</div>
	);

	function makeUrl(message: MessageStore): JSX.Element[] {
		let elements: JSX.Element[] = [];
		let str = '';
		if (message.isHttpOrHttps()) {
			str = message.getUrl().startsWith('http:') || message.getUrl().startsWith('https:')
				? message.getUrl()
				: `${message.getMessage().protocol}//${message.getMessage().serverHost}${message.getUrl()}`;
			const tokens = str.split('://', 2);
			const parts = tokens[1].split('/');
			const host = parts[0];

			let uri = parts.length === 1 ? '/' : '/' + parts.slice(1).join('/');

			elements.push(
				<span>
					{tokens[0]}://
					<span className="request__msg-highlight">
						{host}
					</span>
					{uri}
				</span>
			);
		} else if (message.getMessage().proxyConfig && message.getMessage().proxyConfig?.protocol === 'log:') {
			elements.push(
				<span>
					{message.getUrl()}
				</span>
			);
		} else {
			elements.push(
				<span>
					{message.getMessage().serverHost} message.getUrl()
				</span>
			);
		}
		return elements;
	}
});

export default RequestURL;