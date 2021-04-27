import { spawn } from 'child_process';

export default class Ping {
	public static host(hostName: string): Promise<boolean> {
		return new Promise((resolve) => {
			const proc = spawn('ping', ['-c', '1', hostName]);

			proc.stdout.on('data', data => {
				resolve(true);
			});

			proc.stderr.on('data', data => {
				resolve(false);
			});

			proc.on('error', error => {
				resolve(false);
			});
		})
	}
}