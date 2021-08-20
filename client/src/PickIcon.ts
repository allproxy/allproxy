export default function pickIcon(protocol: string): string {
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