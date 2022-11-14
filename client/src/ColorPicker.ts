import Message from './common/Message';
import pickIcon, { getBrowserIconColor } from './PickIcon';

const colors = ['#007bff', 'green', 'purple', 'brown', 'darkpink', 'slateblue', 'darkorange'];
let count = 0;
let colorMap: Map<string, string> = new Map();

export function colorPickerForIconClass(iconClass: string): string | undefined {
	let color = getBrowserIconColor(iconClass);
	if (color === undefined) {
		if (iconClass.indexOf('terminal') !== -1) {
			return '#6c757d';
		} else if (iconClass.indexOf('file') !== -1) {
			return '#007bff';
		} else {
			return undefined;
		}
	} else {
		return color;
	}
}

export default function colorPicker(message: Message): string {
	const protocol = message.protocol;
	const ua = message.requestHeaders['user-agent'];
	if (message.proxyConfig!.protocol === 'browser:') {
		if (pickIcon(message.proxyConfig!.protocol, ua).indexOf('terminal') === -1) {
			return getBrowserIconColor(ua) || '#6c757d';
		} else {
			return '#6c757d'; // color is set by App.css fa-keyboard
		}
	}

	let key = '';
	if (protocol === 'log:') {
		if (message.proxyConfig?.path) {
			key = message.proxyConfig?.path;
		} else {
			return '#6c757d';
		}
	} else {
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

			if (!colors.includes(color)) {
				console.error(`Color is undefined key=${key} count=${count}, ${colorMap}`);
			}
		}
	}

	return color;
}