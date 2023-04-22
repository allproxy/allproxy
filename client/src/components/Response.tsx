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
	const [tabRequestValue, setTabRequestValue] = React.useState('Request Body');
	const [tabResponseValue, setTabResponseValue] = React.useState('Response Body');


	function handleTabRequestChange(_e: React.ChangeEvent<{}>, value: string) {
		setTabRequestValue(value);
	}

	function handleTabResponseChange(_e: React.ChangeEvent<{}>, value: string) {
		setTabResponseValue(value);
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
				{!vertical && <div style={{ background: '#007bff', height: '0.1rem', marginRight: '4rem' }}></div>}
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
					<div style={{ paddingRight: '4rem' }}>
						<div style={{ background: '#007bff', height: '0.1rem' }}></div>
						<div style={{ display: 'flex' }}>
							<div style={{ width: '50%', padding: '.5rem .5rem 0 0' }}>
								<TabContext value={tabRequestValue}>
									<Tabs
										value={tabRequestValue}
										onChange={handleTabRequestChange}
										indicatorColor="primary"
										textColor="primary"
										aria-label="Response table">
										{Object.keys(message.requestHeaders).length > 0 &&
											<Tab value={'Request Headers'} label={<div>
												<span style={{ marginLeft: '.25rem', color: 'black' }}>Request Headers</span>
											</div>} />}
										<Tab value={'Request Body'} label={<div>
											<span style={{ marginLeft: '.25rem', color: 'black' }}>Request Body</span>
										</div>} />
										{queryParams !== null &&
											<Tab value={'Query Parameters'} label={<div>
												<span style={{ marginLeft: '.25rem', color: 'black' }}>Query Parameters</span>
											</div>} />}
									</Tabs>
									{Object.keys(message.requestHeaders).length > 0 &&
										<TabPanel value={'Request Headers'}>
											<pre>
												{JSON.stringify(message.requestHeaders, null, 2)}
											</pre>
										</TabPanel>}
									<TabPanel value={'Request Body'}>
										{!store.isRequestBodyJson()
											? store.getRequestBody()
											: <ReactJson
												theme={colorScheme === 'dark' ? 'google' : undefined}
												src={message.requestBody as object}
												name={false}
												displayDataTypes={false}
												quotesOnKeys={false} />}
									</TabPanel>
									{queryParams !== null &&
										<TabPanel value={'Query Parameters'}>
											<pre>
												{JSON.stringify(queryParams, null, 2)}
											</pre>
										</TabPanel>}
								</TabContext>
							</div>
							<div style={{ width: '50%', padding: '.5rem 0 0 .5rem', borderLeft: 'solid 0.1rem #007bff' }}>
								<TabContext value={tabResponseValue}>
									<Tabs
										value={tabResponseValue}
										onChange={handleTabResponseChange}
										indicatorColor="primary"
										textColor="primary"
										aria-label="Response table">
										{Object.keys(message.responseHeaders).length > 0 &&
											<Tab value={'Response Headers'} label={<div>
												<span style={{ marginLeft: '.25rem', color: 'black' }}>Response Headers</span>
											</div>} />}
										<Tab value={'Response Body'} label={<div>
											<span style={{ marginLeft: '.25rem', color: 'black' }}>Response Body</span>
										</div>} />
									</Tabs>
									{Object.keys(message.responseHeaders).length > 0 &&
										<TabPanel value={'Response Headers'}>
											<pre>
												{JSON.stringify(message.responseHeaders, null, 2)}
											</pre>
										</TabPanel>}
									<TabPanel value={'Response Body'}>
										{typeof responseBody === 'string'
											? <pre>{responseBody}</pre>
											: responseBody}
									</TabPanel>
								</TabContext>
							</div>
						</div>
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
								<b>Response Body:</b>
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