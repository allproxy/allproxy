import { observer } from 'mobx-react-lite';
import { Dialog, Tab, Tabs } from '@material-ui/core';
import pickIcon, { getBrowserIconColor } from '../PickIcon';
import { Browser, browserStore } from '../store/BrowserStore';
import ImportJSONFileDialog from './ImportJSONFileDialog';
import React from 'react';
import { ConfigCategoryGroups, settingsStore } from '../store/SettingsStore';
import { ConfigProtocol } from '../common/ProxyConfig';
import SessionModal from './SessionModal';
import { sessionStore } from '../store/SessionStore';
import { TabContext, TabPanel } from '@material-ui/lab';
import { jsonLogStore, updateJSONRequestLabels } from '../store/JSONLogStore';
import JSONFieldsModal, { getJSONFields } from './JSONFieldsModal';
import { snapshotStore } from '../store/SnapshotStore';
import { logViewerStore } from '../store/LogViewerStore';

type Props = {
	open: boolean,
	onClose: () => void,
};

const HelpDialog = observer(({ open, onClose }: Props) => {
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);
	const [showSessionModal, setShowSessionModal] = React.useState(false);
	const [tabValue, setTabValue] = React.useState(logViewerStore.isLogViewer() ? '4' : '1');

	const [showJSONFieldsModal, setShowJSONFieldsModal] = React.useState(false);
	const [jsonFields, setJsonFields] = React.useState<{ name: string, count: number, selected: boolean }[]>([]);

	const handleClose = () => {
		onClose();
	};

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
						));
					})
				}
			</div>
		);
	}

	return (
		<><Dialog
			maxWidth={'lg'}
			onClose={handleClose}
			aria-labelledby="simple-dialog-title"
			open={open}>
			<div style={{
				paddingBottom: "2rem",
				paddingLeft: "1.5rem",
				paddingRight: "1rem",
				width: "70vw",
				height: "90vh"
			}}>
				<TabContext value={tabValue}>
					<Tabs
						variant='scrollable'
						value={tabValue}
						onChange={(_, v) => setTabValue(v)}
						textColor="primary"
						indicatorColor="primary"
						aria-label="help-tabs"
					>
						{!logViewerStore.isLogViewer() && <Tab value="1" label="Quick Start" />}
						{!logViewerStore.isLogViewer() && <Tab value="2" label="Certificates" />}
						{!logViewerStore.isLogViewer() && <Tab value="3" label="Filtering" />}
						<Tab value="4" label="Log Viewer" />
					</Tabs>
					<TabPanel value="1" key="1">
						<h4>Quick Start</h4>
						<h5>AllProxy started on <a href="http://localhost:8888/allproxy" target="_blank">localhost:8888</a></h5>
						<p></p>
						<h5>Launch Browser/Terminal:</h5>
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
						<h5>Configure Reverse Proxy:</h5>
						{showConfigButtons()}
						<h5>Shortcuts:</h5>
						- <b>{key}-f</b> Find text in page
					</TabPanel>
					<TabPanel value="2" key="2">
						<h4>Certificates</h4>
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
					</TabPanel>
					<TabPanel value="3" key="3">
						<h4>Filtering</h4>
						<div style={{ paddingLeft: "1rem" }}>
							A search filter criteria can be specified to keep matching lines and remove unmatched lines.  A search term is an operand in a boolean expression.   Boolean operators may be used to more precisely identify matching lines.
							<p></p>
							<h5>Search Terms</h5>
							<div style={{ paddingLeft: ".5rem" }}>
								String Terms and JSON Field Terms are supported.
								<dl>
									<dt>String Term</dt>
									<dd>
										A string term may include one or more words to match any substring in a line.
									</dd>
									<dt>JSON Field Term</dt>
									<dd>
										A JSON field term matches the value of a specific JSON field.  The term <code>field:value</code> does a prefix match by default.  An operator may also be specified <code>field:<b>operator</b>value</code>:
										<div style={{ paddingLeft: ".5rem" }}>
											<div>
												<b>field:<code>&gt;</code>value</b> JSON field float or int greater than value.
											</div>
											<div>
												<b>field:<code>&gt;</code>value</b> JSON field float or int greater than value.
											</div>
											<div>
												<b>field:<code>&ge;</code>value</b> JSON field float or int greater than or equal to value.
											</div>
											<div>
												<b>field:<code>&lt;</code>value</b> JSON field float or int less than value.
											</div>
											<div>
												<b>field:<code>&le;</code>value</b> JSON field float or int less than or equal to value.
											</div>
											<div>
												<b>field:<code>==</code>value</b> Prefix match on JSON field.  The value <code>*</code> matches all fields.
											</div>
											<div>
												<b>field:<code>===</code>value</b> Exact match on JSON field.  The value <code>*</code> matches all fields.
											</div>
										</div>
									</dd>
									<div>Multi-level JSON fields <code>field1.field2.field3:value</code> are also supported.</div>
								</dl>
							</div>
							<h5>Boolean Operators</h5>
							<div style={{ paddingLeft: ".5rem" }}>
								<dl>
									<dt>AND or &&</dt>
									<dd>
										The AND operator performs a boolean and on the search terms.
									</dd>
									<dt>OR or ||</dt>
									<dd>
										The OR operator performs a boolean or on the search terms.
									</dd>
									<dt>NOT, ! or -</dt>
									<dd>
										The NOT operator performs a boolean not on the search term.
									</dd>
								</dl>
							</div>
							<h5>Parenthesis</h5>
							Parenthesis can be used to group related search terms together.
						</div>
					</TabPanel>
					<TabPanel value="4" key="4">
						<h4>Log Viewer</h4>
						JSON logs can be imported and annotated for easier reading.
						<p></p>
						<h5>Annotating JSON Fields</h5>
						Selected JSON fields can be annotated with labels.
						<p></p>
						<div style={{ marginRight: '1rem' }}>
							<button className="btn btn-lg btn-primary"
								style={{ marginBottom: "1rem" }}
								onClick={async () => {
									await jsonLogStore.init();
									setJsonFields(getJSONFields());
									setShowJSONFieldsModal(true);
								}}>
								<div className='fa fa-code'
									style={{
										marginRight: '.5rem'
									}}
								/>
								Annotate JSON Fields
							</button>
						</div>
						<h5>Extract Date, Level, Category and Message</h5>
						A custom script can be defined to extract the date, level, category and message from the JSON log data.
						<p></p>
						<div style={{ marginRight: '1rem' }}>
							<button className="btn btn-lg btn-success"
								style={{ marginBottom: "1rem" }}
								onClick={async () => {
									await jsonLogStore.init();
									setJsonFields(getJSONFields());
									setShowJSONFieldsModal(true);
								}}>
								<div className='fa fa-calendar'
									style={{
										marginRight: '.5rem'
									}}
								/>
								Extract Date...
							</button>
						</div>
						<p></p>
						<h5>Example log message:</h5>
						<pre>
							<div>{'{'}</div>
							<div>  "date": "2023-09-12T18:03:33.496Z"</div>
							<div>  "level": "info"</div>
							<div>  "pod_name": "my-pod-name"</div>
							<div>  "message": "This is a test message."</div>
							<div>{'}'}</div>
						</pre>
						<p></p>
						<h5>Example extract function:</h5>
						<pre>
							<div>// Function called to extract <b>date</b>, <b>level</b>, <b>category</b> and <b>message</b></div>
							<div>//</div>
							<div>// @param <b>preJSONString</b>: string - optional non-JSON string proceeding JSON object</div>
							<div>// @param <b>jsonObject</b>: {'{}'} - JSON log data</div>
							<div>// @returns {'{'}<b>date</b>: Date, <b>level</b>: string, <b>category</b>: string, <b>message</b>: string{'}'}</div>
							<div>//</div>
							<div>// <b>category</b> is the pod name, process ID... </div>
							<div>//</div>
							<div>const myFunction = function(preJSONString, jsonObject) {'{'}</div>
							<div>  let date = new Date(jsonObject.date);</div>
							<div>  let level = jsonObject.level;</div>
							<div>  let category = jsonObject.pod_name;</div>
							<div>  let message = jsonObject.message;</div>
							<div>  let additionalJSON = {'{}'};</div>
							<div>  return {'{date, level, category, message, additionalJSON}'};</div>
							<div>{'}'}</div>
						</pre>
						<h5>Import JSON Log</h5>
						Click this button to import a JSON log file.
						<p></p>
						<div style={{ marginRight: '1rem' }}>
							<button className="btn btn-lg btn-primary"
								style={{ marginBottom: "1rem" }}
								onClick={() => {
									setOpenImportJSONFileDialog(true);
									handleClose();
								}}>
								<div className='fa fa-upload'
									style={{
										marginRight: '.5rem'
									}}
								/>
								Import JSON Log
							</button>
						</div>
					</TabPanel>
				</TabContext>
			</div>
		</Dialog >
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
			<JSONFieldsModal
				open={showJSONFieldsModal}
				onClose={() => {
					setShowJSONFieldsModal(false);
					snapshotStore.setUpdating(true);
					setTimeout(() => {
						updateJSONRequestLabels();
						snapshotStore.setUpdating(false);
					});
				}}
				store={jsonLogStore}
				jsonFields={jsonFields}
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