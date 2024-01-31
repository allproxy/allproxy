import Message from './common/Message';
import pickIcon, { getBrowserIconColor, getBrowserIconColorClass } from './PickIcon';

const colors = ['#007bff', 'green', 'purple', 'brown', 'darkpink', 'slateblue', 'darkorange'];
let count = 0;
let colorMap: Map<string, { color: string, iconClass: string }> = new Map();

export default function colorPicker(message: Message): { color: string, iconClass: string } {
	const protocol = message.protocol;
	const ua = message.requestHeaders['user-agent'] || '';
	if (message.proxyConfig!.protocol === 'browser:') {
		if (pickIcon(message.proxyConfig!.protocol, ua).indexOf('terminal') === -1) {
			return { color: getBrowserIconColor(ua) || '#6c757d', iconClass: getBrowserIconColorClass(ua) || 'icon-color-terminal' };
		} else {
			return { color: '#6c757d', iconClass: 'icon-color-terminal' }; // color is set by App.css fa-keyboard
		}
	}

	let key = '';
	if (protocol === 'log:') {
		if (message.proxyConfig?.path) {
			key = message.proxyConfig?.path;
		}
	} else {
		if (message.clientIp) {
			key = message.clientIp.trim();
		}
	}

	if (key === 'error') {
		return { color: 'red', iconClass: 'error' };
	} else {
		let colorObj = colorMap.get(key);
		if (colorObj === undefined) {
			const index = count++ % colors.length;
			const color = colors[index];
			const iconClass = 'icon-color' + index;
			colorObj = { color, iconClass };
			colorMap.set(key, colorObj);
		}
		return colorObj;
	}
}
