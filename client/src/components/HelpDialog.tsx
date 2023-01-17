import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle, Grid, IconButton, Typography } from '@material-ui/core';
import CloseIcon from "@material-ui/icons/Close";
import pickIcon, { getBrowserIconColor } from '../PickIcon';
import { Browser, browserStore } from '../store/BrowserStore';
import ImportJSONFileDialog from './ImportJSONFileDialog';
import React from 'react';
import { ConfigCategoryGroups, settingsStore } from '../store/SettingsStore';
import { ConfigProtocol } from '../common/ProxyConfig';
import SessionModal from './SessionModal';
import { sessionStore } from '../store/SessionStore';

type Props = {
	open: boolean,
	onClose: () => void,
};

const HelpDialog = observer(({ open, onClose }: Props) => {
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);
	const [showSessionModal, setShowSessionModal] = React.useState(false);

	const handleClose = () => {
		onClose();
	}

	const isMac = navigator.appVersion.indexOf('Mac') !== -1;
	const key = isMac ? 'cmd' : 'ctl';

	function showConfigButtons() {
		const colorMap: Map<ConfigProtocol, string> = new Map();
		colorMap.set('mongo:', "green");
		colorMap.set('redis:', "blue");
		colorMap.set('mysql:', 'orange');
		colorMap.set('grpc:', 'black');
		colorMap.set('http:', 'steelblue');
		colorMap.set('https:', 'green');
		colorMap.set('tcp:', 'red');
		return (
			<div>
				{
					settingsStore.getConfigCategories().map(category => {
						if (category === 'FORWARD PROXY' || category === 'JSON LOGS') return null;
						return ConfigCategoryGroups.get(category)?.map(proto => (
							<span style={{ marginRight: '1rem' }}>
								<button className="btn btn-lg btn-secondary"
									onClick={() => {
										settingsStore.setTabCategory(category);
										settingsStore.setTabProtocol(proto.protocol);
										settingsStore.toggleOpenSettingsModal();
										settingsStore.reset();
									}}
									style={{ marginBottom: '1rem', background: colorMap.get(proto.protocol) }}
								>
									<div className={pickIcon(proto.protocol, '')}
										style={{
											marginRight: '.5rem'
										}}
									/>
									{proto.name}
								</button>
							</span>
						))
					})
				}
			</div>
		);
	}

	return (
		<><Dialog onBackdropClick={handleClose} maxWidth={'lg'} onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title">
				<Grid container justify="space-between" alignItems="center">
					<Typography><h3>Welcome</h3></Typography>
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
				<h4>AllProxy started on <a href="http://localhost:8888/allproxy" target="_blank">localhost:8888</a></h4>
				<p></p>
				<h4>Launch Browser/Terminal or View Log:</h4>
				{
					browserStore.getBrowsers().map(browser => (
						<span style={{ marginRight: '1rem' }}>
							<button className="btn btn-lg btn-secondary"
								style={{ marginBottom: "1rem", background: getBrowserIconColor(browserName(browser)) }}
								onClick={() => {
									browserStore.launchBrowser(browser);
									handleClose();
								}}>
								<div className={pickIcon('browser:', browser.name)}
									style={{
										marginRight: '.5rem'
									}} />
								{browserName(browser)}
							</button>
						</span>
					))
				}
				<span style={{ marginRight: '1rem' }}>
					<button className="btn btn-lg btn-primary"
						style={{ marginBottom: "1rem" }}
						onClick={() => {
							setOpenImportJSONFileDialog(true);
							handleClose();
						}}>
						<div className={pickIcon('log:', '')}
							style={{
								marginRight: '.5rem'
							}}
						/>
						JSON Log
					</button>
				</span>
				<h4>Reverse Proxy Configuration:</h4>
				{showConfigButtons()}
				<h4>Shortcuts:</h4>
				- <b>{key}-f</b> Find text in page
				<p></p>
				<h4>Manual Setup:</h4>
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
						<br></br>(If "permission denied", run chmod +x {(trustCertCmd().split(" ")[0])})
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
								<br></br>(If "permission denied", run chmod +x {systemProxyCmd().split(" ")[0]})
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
			<ImportJSONFileDialog
				open={openImportJSONFileDialog}
				onClose={() => {
					setOpenImportJSONFileDialog(false);
				}} />
			<SessionModal
				open={showSessionModal}
				onClose={() => setShowSessionModal(false)}
				store={sessionStore}
			/>
		</>
	);
});

function browserName(browser: Browser): string {
	let name = browser.name.replace('msedge', 'edge');
	name = name.substring(0, 1).toUpperCase() + name.substring(1);
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