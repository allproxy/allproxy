import { assert } from 'console';
import Message from './common/Message';

const colors = ['blue', 'green', 'darkorange', 'purple', 'brown', 'darkpink', 'slateblue', 'darkred'];
let count = 0;
let colorMap: Map<string, string> = new Map();

export default function colorPicker(message: Message): string {
	const protocol = message.proxyConfig
		? message.proxyConfig.protocol
		: message.protocol;

	let key = '';
	switch (protocol) {
		case 'browser:':
			key = protocol;
			break;
		case 'log:':
			const command = message.proxyConfig!.path.trim();
			const tokens = command.split(' ');
			key = tokens[tokens.length-1];
			break;
		default:
			if (message.clientIp) {
				key = message.clientIp.trim();
			}
	}

	let color = colorMap.get(key);
	if (color === undefined) {
		if (key === 'error') {
			color = 'red';
		} else {
			color = colors[count % colors.length];
			++count;
			colorMap.set(key, color);
		}
	}

	return color;
}