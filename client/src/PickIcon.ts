import { ConfigProtocol } from "./common/ProxyConfig";

export default function pickIcon(protocol: ConfigProtocol, userAgent?: string): string {
	let iconClass = '';
	switch (protocol) {
		case 'http:':
		case 'https:':
			iconClass = 'fa fa-paper-plane';
			break;
		case 'browser:':
			iconClass = browserIcon(userAgent);
			break;
		case 'mysql:':
			iconClass = 'fa fa-database';
			break;
		case 'mongo:':
			iconClass = 'fa fa-leaf';
			break;
		case 'redis:':
			iconClass = 'fa fa-cube';
			break;
		case 'grpc:':
			iconClass = 'fa fa-bahai';
			break;
		case 'log:':
			iconClass = 'fa fa-file';
			break;
		default:
			iconClass = 'fa fa-arrows-alt-h';
	}
	return iconClass;
}

declare global {
	interface Window {
		opr: any | undefined;
		opera: any | undefined;
		chrome: any | undefined;
		HTMLElement: any | undefined;
		StyleMedia: any | undefined;
	}

	interface Document {
		documentMode: string;
	}
}

declare const InstallTrigger: any;

export function getBrowserIconColor(userAgent: string): string | undefined {
	const icon = pickIcon('browser:', userAgent);
	if (icon.indexOf('chrome') !== -1) return '#4DCE5B';
	if (icon.indexOf('chromium') !== -1) return '#4DCE5B';
	if (icon.indexOf('opera') !== -1) return '#F76464';
	if (icon.indexOf('firefox') !== -1) return 'orangered';
	if (icon.indexOf('edge') !== -1) return '#007bff';
	if (icon.indexOf('safari') !== -1) return '#007bff';
	if (icon.indexOf('explorer') !== -1) return '#007bff';
	return undefined;
}

export function getDisplayableUserAgent(userAgent: string): string {
	const icon = pickIcon('browser:', userAgent);
	if (icon.indexOf('chrome') !== -1) return 'Chrome';
	if (icon.indexOf('chromium') !== -1) return 'Chromium';
	if (icon.indexOf('opera') !== -1) return 'Opera';
	if (icon.indexOf('firefox') !== -1) return 'Firefox';
	if (icon.indexOf('edge') !== -1) return 'Edge';
	if (icon.indexOf('safari') !== -1) return 'Safari';
	if (icon.indexOf('explorer') !== -1) return 'Explorer';
	const out = userAgent.split(' ')[0];
	return out.split('/')[0];
}

function browserIcon(userAgent?: string): string {
	let icon = 'fa fa-window-maximize';

	if (userAgent) {
		userAgent = userAgent.toLowerCase();
		if (userAgent.includes('firefox')) {
			return 'fab fa-firefox';
		}
		if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
			return 'fab fa-chrome';
		}
		if (userAgent.includes('safari')) {
			return 'fab fa-safari';
		}
		if (userAgent.includes('edge')) {
			return 'fab fa-edge';
		}
		if (userAgent.includes('explorer')) {
			return 'fab fa-internet-explorer';
		}
		if (userAgent.includes('opera')) {
			return 'fab fa-opera';
		}
		return 'fas fa-keyboard';
		// return 'fas fa-terminal';
	}

	// Opera 8.0+
	const isOpera = (!!window.opr && !!window.opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	if (isOpera) {
		icon = 'fab fa-opera';
	}

	// Firefox 1.0+
	const isFirefox = typeof InstallTrigger !== 'undefined';
	if (isFirefox) {
		icon = 'fab fa-firefox';
	}

	// Safari 3.0+ "[object HTMLElementConstructor]"
	// const isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && window['safari'].pushNotification));
	// if (isSafari) {
	// 	icon = 'fa-safari';
	// }

	// Internet Explorer 6-11
	const isIE = /*@cc_on!@*/false || !!document.documentMode;
	if (isIE) {
		icon = 'fab fa-edge-legacy';
	}

	// Edge 20+
	const isEdge = !isIE && !!window.StyleMedia;
	if (isEdge) {
		icon = 'fab fa-edge';
	}

	// Chrome 1 - 79
	const isChrome = !!window.chrome /*&& (!!window.chrome.webstore || !!window.chrome.runtime)*/;
	if (isChrome) {
		icon = 'fab fa-chrome';
	}

	// Edge (based on chromium) detection
	const isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") !== -1);
	if (isEdgeChromium) {
		icon = 'fab fa-edge';
	}

	// Blink engine detection
	// const isBlink = (isChrome || isOpera) && !!window.CSS;

	return icon;
}