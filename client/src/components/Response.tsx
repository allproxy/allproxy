import React, { ReactElement } from 'react';
import Message from '../common/Message';
import { Accordion, AccordionSummary, AccordionDetails, CircularProgress, IconButton, Tabs, Tab } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ReactJson from 'react-json-view';
import MessageStore from '../store/MessageStore';
import { colorScheme } from '../App';
import CloseIcon from "@material-ui/icons/Close";
import { formatTimestamp } from './Request';
import { TabContext, TabPanel } from '@material-ui/lab';


type Props = {
	message: Message,
	store: MessageStore,
	vertical: boolean,
	onSync: () => void,
	onClose: () => void,
};
const Response = ({ message, store, vertical, onSync, onClose }: Props) => {
	const LOADING = 'Loading...';
	const [responseBody, setResponseBody] = React.useState<string | ReactElement<any, any>>(LOADING);
	const [tabValue, setTabValue] = React.useState('Response Data');

	function handleTabChange(_e: React.ChangeEvent<{}>, value: string) {
		setTabValue(value);
	}

	if (message.protocol === 'log:') {
		vertical = true;
	}

	const queryParams = getQueryParams(message);
	getResponseBody(message)
		.then((rb) => setResponseBody(rb));
	return (
		<div style={{ paddingRight: '2rem' }}>
			<React.Fragment>
				<IconButton style={{ marginRight: '.5rem' }} onClick={onClose} title="Close response panel">
					<CloseIcon />
				</IconButton>
				<button className="btn btn-sm btn-success" onClick={onSync} title="Sync request and response panels">Sync</button>
				{message.protocol !== 'log:' && <div><b>Time:&nbsp;</b>{formatTimestamp(message.timestamp)}</div>}
				{store.getMessage().protocol !== 'log:' &&
					<div>
						<b>Elapsed time:&nbsp;</b>{message.elapsedTime} ms
					</div>
				}
				{store.getMessage().protocol !== 'log:' &&
					<div className={message.status < 400 ? '' : 'error'}>
						<b>Status:&nbsp;</b>{message.status}
					</div>
				}
				{store.isGrpc() && (
					<div>
						<div className={store.getGrpcStatus() === 0 ? '' : 'error'}>
							<b>GRPC Status:&nbsp;</b>{store.getGrpcStatus()}
						</div>
						{store.getGrpcMessage().length > 0 && (
							<div>
								<b>GRPC Message:&nbsp;</b>{store.getGrpcMessage()}
							</div>)}
					</div>
				)}
				{store.getMessage().protocol !== 'log:' && store.getMessage().url != undefined &&
					<div>
						<b>URL:&nbsp;</b><div style={{ paddingTop: '.5rem', paddingBottom: '.5rem' }}>{message.url}</div>
					</div>
				}

				{!vertical &&
					<div>
						<TabContext value={tabValue}>
							<Tabs
								value={tabValue}
								onChange={handleTabChange}
								indicatorColor="primary"
								textColor="primary"
								aria-label="Response table">
								{Object.keys(message.requestHeaders).length > 0 &&
									<Tab value={'Request Headers'} label={
										<div>
											<span style={{ marginLeft: '.25rem', color: 'black' }}>Request Headers</span>
										</div>
									} />}
								{Object.keys(message.responseHeaders).length > 0 &&
									<Tab value={'Response Headers'} label={
										<div>
											<span style={{ marginLeft: '.25rem', color: 'black' }}>Response Headers</span>
										</div>
									} />}
								{queryParams !== null &&
									< Tab value={'Query Parameters'} label={
										<div>
											<span style={{ marginLeft: '.25rem', color: 'black' }}>Query Parameters</span>
										</div>
									} />}
								<Tab value={'Response Data'} label={
									<div>
										<span style={{ marginLeft: '.25rem', color: 'black' }}>Response Data</span>
									</div>
								} />
							</Tabs>
							{Object.keys(message.requestHeaders).length > 0 &&
								< TabPanel value={'Request Headers'}>
									<pre>
										{JSON.stringify(message.requestHeaders, null, 2)}
									</pre>
								</TabPanel>}
							{Object.keys(message.responseHeaders).length > 0 &&
								< TabPanel value={'Response Headers'}>
									<pre>
										{JSON.stringify(message.responseHeaders, null, 2)}
									</pre>
								</TabPanel>}
							{queryParams !== null &&
								<TabPanel value={'Query Parameters'}>
									<pre>
										{JSON.stringify(queryParams, null, 2)}
									</pre>
								</TabPanel>}
							<TabPanel value={'Response Data'}>
								{typeof responseBody === 'string'
									? <pre>{responseBody}</pre>
									: responseBody
								}
							</TabPanel>
						</TabContext>
					</div>
				}

				{
					vertical && Object.keys(message.requestHeaders).length > 0 ?
						< Accordion >
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<b>Request Headers:</b>
							</AccordionSummary>
							<AccordionDetails>
								<pre>
									{JSON.stringify(message.requestHeaders, null, 2)}
								</pre>
							</AccordionDetails>
						</Accordion>
						: null
				}
				{
					vertical && Object.keys(message.responseHeaders).length > 0 ?
						<Accordion>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<b>Response Headers:</b>
							</AccordionSummary>
							<AccordionDetails>
								<pre>
									{JSON.stringify(message.responseHeaders, null, 2)}
								</pre>
							</AccordionDetails>
						</Accordion>
						: null
				}
				{
					vertical && queryParams ?
						<Accordion>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<b>Query Parameters:</b>
							</AccordionSummary>
							<AccordionDetails>
								<pre>
									{JSON.stringify(queryParams, null, 2)}
								</pre>
							</AccordionDetails>
						</Accordion>
						: null
				}

				{
					vertical &&
					(store.getMessage().protocol === 'log:' ?
						renderLogEntry()
						:
						<Accordion defaultExpanded={true}>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<b>Response Data:</b>
							</AccordionSummary>
							<AccordionDetails>
								{typeof responseBody === 'string'
									? <pre>{responseBody}</pre>
									: responseBody
								}
							</AccordionDetails>
						</Accordion>
					)
				}
				{
					responseBody === LOADING &&
					<div style={{
						width: '100%',
						marginTop: '1rem',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
					}}>
						<CircularProgress />
					</div>
				}

			</React.Fragment >
		</div >
	);

	function renderLogEntry() {
		if (typeof responseBody === 'string') {
			if (Object.keys(store.getLogEntry().additionalJSON)) {
				return (
					<>
						<div>{responseBody}</div>
					</>
				);
			} else {
				return <div>{responseBody}</div>
			}
		} else {
			return responseBody;
		}
	}

	async function getResponseBody(message: Message): Promise<string | ReactElement<any, any>> {
		return new Promise((resolve) => {
			let response: string | ReactElement<any, any>;
			if (typeof message.responseBody === 'object') {
				response = <ReactJson
					theme={colorScheme === 'dark' ? 'google' : undefined}
					src={message.responseBody}
					name={false}
					displayDataTypes={false}
					quotesOnKeys={false}
				/>;
			} else {
				response = message.responseBody;
			}
			setTimeout(() => resolve(response));
		});
	}
}

function getQueryParams(message: Message): string[] | null {
	// Format query parameters
	let queryParams: string[] = [];
	if (message.url && message.url.indexOf('?') !== -1) {
		var temp = message.url!.split('?')[1];
		temp.split('&').forEach(function (param) {
			var keyValue = param.split('=');
			var value = keyValue.length > 1 ? unescape(keyValue[1]) : undefined;
			queryParams.push(keyValue[0] + ' = ' + value);
		})
	}
	return queryParams.length === 0 ? null : queryParams;
}

export default Response;