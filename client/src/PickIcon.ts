export default function pickIcon(protocol: string): string {
	let iconClass = '';
	switch (protocol) {
		case 'http:':
		case 'https:':
			iconClass = 'fa-paper-plane';
			break;
		case 'proxy:':
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
			iconClass = 'fa-asterisk';
			break;
		case 'log:':
			iconClass = 'fa-exclamation-triangle';
			break;
		default:
			iconClass = 'fa-square';
	}
	return iconClass;
}