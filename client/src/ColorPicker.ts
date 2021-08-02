import { assert } from 'console';
import Message from './common/Message';

const colors = ['blue', 'green', 'darkorange', 'purple', 'brown', 'darkpink', 'slateblue', 'darkred'];
let unusedColors: string[] = [];
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
			if (unusedColors.length === 0) {
				unusedColors = colors.map(color => color);
			}
			color = unusedColors[0];
			unusedColors.splice(0, 1);
			hostColor.set(hostPath, color);
		}
	}

	return color;
}