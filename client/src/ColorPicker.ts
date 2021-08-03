import { assert } from 'console';
import Message from './common/Message';

const colors = ['blue', 'green', 'darkorange', 'purple', 'brown', 'darkpink', 'slateblue', 'darkred'];
let count = 0;
let hostColor: Map<string, string> = new Map(); // key=message.serverHost[message.path]

export default function colorPicker(message: Message): string {
	const hostPath = message.clientIp
		+ message.serverHost
		+ (message.path ? message.path : '')
		+ (message.protocol ? message.protocol : '');
	let color = hostColor.get(hostPath);
	if (color === undefined) {
		if (hostPath === 'error') {
			color = 'red';
		} else {
			color = colors[count % colors.length];
			++count;
			hostColor.set(hostPath, color);
		}
	}

	return color;
}