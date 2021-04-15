import Message from './common/Message';

export default function pickIcon(message: Message): string {
	let iconClass = '';
	if(message.method) {
		iconClass = message.requestHeaders['middleman_proxy'] === 'resend' ? 'fa-clone' : 'fa-paper-plane';
		iconClass += ' resend-icon';
	}
	else {
		switch(message.protocol) {
			case 'sql:':
				iconClass = 'fa-database';
				break;
			case 'mongo:':
				iconClass = 'fa-envira';
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
	}
	return iconClass;
}