import Message from './common/Message';

const colors = ['blue', 'green', 'darkorange', 'purple', 'brown', 'grey', 'slateblue', 'darkred'];
let hostColor: Map<string, string> = new Map(); // key=message.serverHost[message.path]

export default function colorPicker(message: Message): string {
	const hostPath = message.clientIp
		+ message.serverHost
		+ (message.path ? message.path : '')
		+ (message.protocol ? message.protocol : '');
	if(hostColor.get(hostPath) === undefined) {
		hostColor.set(hostPath, hostPath === 'error' ? 'red' : colors.splice(0,1)[0]);
	}

	return hostColor.get(hostPath)!;
}