import Message from './common/Message';
import pickIcon, { getBrowserIconColor } from './PickIcon';

const colors = ['blue', 'green', 'purple', 'brown', 'darkpink', 'slateblue', 'darkorange'];
let count = 0;
let colorMap: Map<string, string> = new Map();

export default function colorPicker(message: Message): string {
	const protocol = message.protocol;
	const ua = message.requestHeaders['user-agent'];
	if (message.proxyConfig!.protocol === 'browser:') {
		if (pickIcon(message.proxyConfig!.protocol, ua).indexOf('keyboard') === -1) {
			return getBrowserIconColor(ua) || 'whitesmoke';
		} else {
			return ''; // color is set by App.css fa-keyboard
		}
	}

	if (protocol === 'log:') {
		return 'brown';
	}

	let key = '';
	if (message.clientIp) {
		key = message.clientIp.trim();
	}

	let color = colorMap.get(key);
	if (color === undefined) {
		if (key === 'error') {
			color = 'red';
		} else {
			color = colors[count % colors.length];
			++count;
			colorMap.set(key, color);

			if (!colors.includes(color)) {
				console.error(`Color is undefined key=${key} count=${count}, ${colorMap}`);
			}
		}
	}

	return color;
}