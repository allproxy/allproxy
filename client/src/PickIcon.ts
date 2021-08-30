export default function pickIcon(protocol: string, userAgent?: string): string {
	let iconClass = '';
	switch (protocol) {
		case 'http:':
		case 'https:':
			iconClass = 'fa-paper-plane';
			break;
		case 'browser:':
			iconClass = 'fa-window-maximize';
			break;
		case 'sql:':
			iconClass = 'fa-database';
			break;
		case 'mongo:':
			iconClass = 'fa-leaf';
			break;
		case 'redis:':
			iconClass = 'fa-cube';
			break;
		case 'grpc:':
			iconClass = 'fa-bahai';
			break;
		case 'log:':
			iconClass = 'fa-exclamation-triangle';
			break;
		default:
			iconClass = 'fa-arrows-alt-h';
	}
	return iconClass;
}

declare global {
	interface Window {
		opr: any | undefined;
		opera: any | undefined;
		chrome: any | undefined;
		HTMLElement: any | undefined;
	}

	interface Document {
		documentMode:string;
	}
}

declare const InstallTrigger: any;

function browserIcon(userAgent?: string): string {
	let icon = 'fa-window-maximize';

	if (userAgent) {
		userAgent = userAgent.toLowerCase();
		if (userAgent.includes('firefox')) {
			return 'fa-firefox';
		}
		if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
			return 'fa-chrome';
		}
	}

	// Opera 8.0+
	const isOpera = (!!window.opr && !!window.opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	if (isOpera) {
		icon = 'fa-opera';
	}

	// Firefox 1.0+
	const isFirefox = typeof InstallTrigger !== 'undefined';
	if (isFirefox) {
		icon = 'fa-firefox';
	}

	// Safari 3.0+ "[object HTMLElementConstructor]"
	// const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
	// if (isSafari) {
	// 	icon = 'fa-safari';
	// }

	// Internet Explorer 6-11
	const isIE = /*@cc_on!@*/false || !!document.documentMode;
	if (isIE) {
		icon = 'fa-edge-legacy';
	}

	// Edge 20+
	const isEdge = !isIE && !!window.StyleMedia;
	if (isEdge) {
		icon = 'fa-edge';
	}

	// Chrome 1 - 79
	const isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
	if (isChrome) {
		icon = 'fa-chrome';
	}

	// Edge (based on chromium) detection
	const isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") !== -1);
	if (isEdgeChromium) {
		icon = 'fa-edge';
	}

	// Blink engine detection
	// const isBlink = (isChrome || isOpera) && !!window.CSS;

	return icon;
}