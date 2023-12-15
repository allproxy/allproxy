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
import { mainTabStore } from '../store/MainTabStore';
import { urlPathStore } from '../store/UrlPathStore';
import JSONSimpleFields from './JSONSimpleFields';
import JSONFieldsMethods from './JSONParsingMethod';
import BreakpointModal from './BreakpointModal';
import { breakpointStore } from '../store/BreakpointStore';

type Props = {
	open: boolean,
	onClose: () => void,
};

const HelpDialog = observer(({ open, onClose }: Props) => {
	const [openImportJSONFileDialog, setOpenImportJSONFileDialog] = React.useState(false);
	const [showSessionModal, setShowSessionModal] = React.useState(false);
	const [tabValue, setTabValue] = React.useState(urlPathStore.getApp() === 'jlogviewer' ? '3' : '1');

	const [showJSONFieldsModal, setShowJSONFieldsModal] = React.useState(false);
	const [jsonFieldsModalTab, setJsonFieldsModalTab] = React.useState<'jsonFields' | 'scripts' | 'showFields'>('scripts');
	const [jsonFields, setJsonFields] = React.useState<{ name: string, count: number, selected: boolean }[]>([]);

	const [showBreakpointModal, setShowBreakpointModal] = React.useState(false);

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

	jsonLogStore.init();
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
						{urlPathStore.getApp() !== 'jlogviewer' && <Tab value="1" label="Quick Start" />}
						{urlPathStore.getApp() !== 'jlogviewer' && <Tab value="2" label="Certificates" />}
						{urlPathStore.getApp() !== 'mitmproxy' && <Tab value="3" label="Log Viewer" />}
						<Tab value="4" label="Filtering" />
						{urlPathStore.getApp() !== 'jlogviewer' && <Tab value="5" label="Breakpoints" />}
					</Tabs>
					<TabPanel value="1" key="1">
						<h4>Quick Start</h4>
						<h3>URL: <a href={`http://localhost:8888/${urlPathStore.getApp()}`}
							target="_blank">{'localhost:8888/' + urlPathStore.getApp()}</a></h3>
						<p></p>
						<h3>Launch Browser/Terminal:</h3>
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
						<h3>Configure Reverse Proxy:</h3>
						{showConfigButtons()}
						<h3>Shortcuts:</h3>
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
						<h3>Define Date, Level, App Name and Message</h3>
						Use the <b>Simple</b> or <b>Advanced</b> method to identify the date, level, app name and message fields in the JSON log entry.
						<div style={{ margin: '1rem 3rem 1rem 1rem' }}>
							<JSONFieldsMethods />
							{jsonLogStore.getParsingMethod() === 'auto' ?
								<div>Automatically select Date, Level, Message, and annotate other JSON fields.</div>
								: jsonLogStore.getParsingMethod() === 'simple' ?
									<JSONSimpleFields />
									:
									<>
										Write your own JavaScript to extract the date, level, app name and message fields.
										<p></p>
										<button className="btn btn-lg btn-success"
											style={{ marginBottom: "1rem" }}
											onClick={async () => {
												await jsonLogStore.init();
												setJsonFields(getJSONFields());
												setJsonFieldsModalTab('scripts');
												setShowJSONFieldsModal(true);
											}}>
											<div className='fa fa-calendar'
												style={{
													marginRight: '.5rem'
												}}
											/>
											Edit JavaScript
										</button>
									</>
							}
						</div>
						<h3>Annotate Fields and Import Log File</h3>
						<p></p>
						<div style={{ marginLeft: '1rem' }}>
							<button className="btn btn-lg btn-primary"
								style={{ marginRight: "1rem" }}
								onClick={async () => {
									await jsonLogStore.init();
									setJsonFields(getJSONFields());
									setJsonFieldsModalTab('jsonFields');
									setShowJSONFieldsModal(true);
								}}>
								<div className='fa fa-code'
									style={{
										marginRight: '.5rem'
									}}
								/>
								Annotate JSON Fields
							</button>
							<button className="btn btn-lg btn-success"
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
					<TabPanel value="4" key="4">
						<h4>Filtering</h4>
						<div style={{ paddingLeft: "1rem" }}>
							A search filter criteria can be specified to keep matching lines and remove unmatched lines.  A search term is an operand in a boolean expression.   Boolean operators may be used to more precisely identify matching lines.
							<p></p>
							<h3>Search Terms</h3>
							<div style={{ paddingLeft: ".5rem" }}>
								String Terms and JSON Field Terms are supported.
								<dl>
									<dt>String Term</dt>
									<dd>
										A string term may include one or more words to match any substring in a line.
									</dd>
									<dt>JSON key:value</dt>
									<dd>
										A JSON key:value matches on JSON fields.  The <code>key:value</code> does a prefix match by default.  An operator may also be specified <code>key:<b>operator</b>value</code>:
										<div style={{ paddingLeft: ".5rem" }}>
											<div>
												<b>key:<code>&gt;</code>value</b> JSON field float or int greater than value.
											</div>
											<div>
												<b>key:<code>&gt;</code>value</b> JSON field float or int greater than value.
											</div>
											<div>
												<b>key:<code>&ge;</code>value</b> JSON field float or int greater than or equal to value.
											</div>
											<div>
												<b>key:<code>&lt;</code>value</b> JSON field float or int less than value.
											</div>
											<div>
												<b>key:<code>&le;</code>value</b> JSON field float or int less than or equal to value.
											</div>
											<div>
												<b>key:<code>==</code>value</b> Prefix match on JSON field.  The value <code>*</code> matches all fields.
											</div>
											<div>
												<b>key:<code>===</code>value</b> Exact match on JSON field.  The value <code>*</code> matches all fields.
											</div>
											<div>
												<b>*:<code>===</code>value</b> Match string value of any JSON field.  The <code>value</code> is checked against all JSON fields.
											</div>
										</div>
									</dd>
									<div>Multi-level JSON keys <code>field1.field2.field3:value</code> are also supported.</div>
								</dl>
							</div>
							<h3>Boolean Operators</h3>
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
							<h3>Parenthesis</h3>
							Parenthesis can be used to group related search terms together.
							<p></p>
							<h3>HTTP Filters</h3>
							These HTTP field filters are supported:
							<dl>
								<dt>host</dt>
								<dd>HTTP request host name (e.g., host:my.host.name).</dd>
								<dt>status</dt>
								<dd>HTTP response status code (e.g., status:&gt;=500).</dd>
								<dt>method</dt>
								<dd>HTTP request method (e.g., method:post).</dd>
								<dt>url</dt>
								<dd>HTTP request URL string (e.g., utl:my/url/path)</dd>
							</dl>
							Any field may be filtered in the:
							<ul>
								<li>Request Headers</li>
								<li>Response Headers</li>
								<li>Request Body</li>
								<li>Response Body</li>
							</ul>
							A full text search is used by default.
							<p></p>
							<h3>Deduplication Filters</h3>
							A <b>deduplication</b> filter is a special type of field filter used to remove consecutive records having duplicate values (state).  When the <b>Deduplication</b> checkbox is checked, duplicate records are removed, and only the state transitions or value change are shown.
							<p></p>
							A <b>deduplication</b> filter is of the form <b>field:*</b>.  The removal of duplicate records can be toggled on and off using the <b>Dedup</b> checkbox.  Here is an example <b>deduplication</b> filter.
							<ul>
								<li><code>(id:12345 AND state:*)</code></li>
							</ul>
						</div>
					</TabPanel>
					<TabPanel value="5" key="5">
						<h4>Breakpoints</h4>
						<p></p>
						Set breakpoints to stop the HTTP request and optionally modify it before sending it to the web server.
						<p></p>
						<span style={{ marginRight: '1rem' }}>
							<button className="btn btn-lg btn-secondary"
								style={{ marginBottom: "1rem", background: 'red' }}
								onClick={() => {
									setShowBreakpointModal(true);
									handleClose();
								}}>
								<div className="fa fa-bug"
									style={{
										marginRight: '.5rem'
									}} />
								Create Breakpoint
							</button>
						</span>
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
			{
				showJSONFieldsModal &&
				<JSONFieldsModal
					open={showJSONFieldsModal}
					onClose={() => {
						setShowJSONFieldsModal(false);
						mainTabStore.setUpdating(true);
						setTimeout(() => {
							updateJSONRequestLabels();
							mainTabStore.setUpdating(false);
						});
					}}
					store={jsonLogStore}
					jsonFields={jsonFields}
					selectTab={jsonFieldsModalTab}
				/>
			}
			{
				showBreakpointModal &&
				<BreakpointModal
					open={showBreakpointModal}
					onClose={() => {
						setShowBreakpointModal(false);
					}}
					store={breakpointStore}
				/>
			}
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