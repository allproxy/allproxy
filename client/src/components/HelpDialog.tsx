import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle, Grid, IconButton, Typography } from '@material-ui/core';
import CloseIcon from "@material-ui/icons/Close";
import pickIcon, { getBrowserIconColor } from '../PickIcon';
import { Browser, browserStore } from '../store/BrowserStore';

type Props = {
	open: boolean,
	onClose: () => void,
};

const HelpDialog = observer(({ open, onClose }: Props) => {

	const handleClose = () => {
		onClose();
	}

	const isMac = navigator.appVersion.indexOf('Mac') !== -1;
	const key = isMac ? 'cmd' : 'ctl';

	return (
		<Dialog onBackdropClick={handleClose} maxWidth={'lg'} onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">
				<Grid container justify="space-between" alignItems="center">
					<Typography><h3>Help</h3></Typography>
					<IconButton onClick={handleClose}>
						<CloseIcon />
					</IconButton>
				</Grid>
			</DialogTitle>
			<div style={{
				paddingBottom: "2rem",
				paddingLeft: "1.5rem",
				paddingRight: "1rem"
			}}>
				<b>AllProxy</b> started on <b>localhost:8888</b>
				<p></p>
				<b>Launch Browser:</b>
				<b></b>
				{showBrowsers()}
				<p></p>
				<b>Shortcuts:</b>
				<br></br>
				- <b>{key}-f</b> Find text in page
				<p></p>
				<b>Manual Setup:</b>
				<ol style={{ paddingLeft: "1rem" }}>
					<li>
						<b>Trust AllProxy certificate:</b>
						<br></br>
						Run in terminal: <strong>{trustCertCmd()}</strong>
						<button type="button" className="btn btn-sm btn-default"
							title="Copy"
							onClick={() => navigator.clipboard.writeText(trustCertCmd())}
						>
							<div className="fa fa-copy" />
						</button>
						<p></p>
						This will import the AllProxy CA certificate into your certificate store
						and mark it as trusted.
						<p></p>
						For some browsers (eg, Firefox) you may also need to import the AllProxy CA
						certificate into the browser trust store.
						<p></p>
					</li>
					<li>
						<b>Capture Browser Traffic:</b>
						<ul style={{
							listStyleType: 'none',
							paddingLeft: 0
						}}>
							<li>
								Configure System Proxy
								<br></br>
								- Run in terminal: <b>{systemProxyCmd()}</b>
								<button type="button" className="btn btn-sm btn-default"
									title="Copy"
									onClick={() => navigator.clipboard.writeText(systemProxyCmd())}
								>
									<div className="fa fa-copy" />
								</button>
								<p></p>
								Some browsers (eg, Firefox) do not use the system proxy settings.
								<p></p>
							</li>
							<li>
								Configure Browser Proxy
								<br></br>
								- Configure your browser proxy settings to host=localhost and port=8888
							</li>
						</ul>
						<p></p>
					</li>
					<li>
						<b>Capture Terminal Commands:</b>
						<br></br>
						- For secure HTTPS, set HTTPS_PROXY=localhost:8888
						<br></br>
						- For unsecure HTTP, set HTTP_PROXY=localhost:8888
						<br></br>
						- To exclude hosts, set NO_PROXY="domain1,domain2,domain3"
					</li>
				</ol>
			</div>
		</Dialog>
	);
});

function showBrowsers() {
	return (
		<div>
			{browserStore.getBrowsers().length === 0 ?
				'No browsers detected.'
				: browserStore.getBrowsers().map(browser => (
					<span style={{ marginRight: '1rem' }}>
						<button className="btn btn-lg btn-primary"
							style={{ background: getBrowserIconColor(browserName(browser)) }}
							onClick={() => browserStore.launchBrowser(browser)}>
							<div className={pickIcon('browser:', browser.name.replace('msedge', 'edge'))}
								style={{
									marginRight: '.5rem'
								}} />
							{browserName(browser)}
						</button>
					</span>
				))}
		</div>
	);
}

function browserName(browser: Browser): string {
	const name = browser.name.replace('msedge', 'edge').substring(0, 1).toUpperCase() + browser.name.substring(1);
	return name;
}

function isWin32(): boolean {
	return window.navigator.userAgent.indexOf('Windows') !== -1;
}

function trustCertCmd(): string {
	const cmd = isWin32() ? '%USERPROFILE%\\.allproxy\\bin\\trustCert.bat' : '~/.allproxy/bin/trustCert.sh enable';
	return cmd;
}

function systemProxyCmd(): string {
	const cmd = isWin32() ? '%USERPROFILE%\\.allproxy\\bin\\systemProxy.bat' : '~/.allproxy/bin/systemProxy.sh enable';
	return cmd;
}

export default HelpDialog;