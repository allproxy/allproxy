import React, { ReactElement } from 'react';
import Message from '../common/Message';
import { Accordion, AccordionSummary, AccordionDetails, CircularProgress, IconButton } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ReactJson from 'react-json-view';
import MessageStore from '../store/MessageStore';
import { colorScheme } from '../App';

type Props = {
	message: Message,
	store: MessageStore,
	onClose: () => void,
};
const Response = ({ message, store, onClose }: Props) => {
	const LOADING = 'Loading...';
	const [responseBody, setResponseBody] = React.useState<string | ReactElement<any, any>>(LOADING);

	const queryParams = getQueryParams(message);
	getResponseBody(message)
		.then((rb) => setResponseBody(rb));
	return (
		<div>
			<React.Fragment>
				<IconButton onClick={onClose}>
					<div className={"fa fa-chevron-right"} />
				</IconButton>
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
				{store.getMessage().protocol !== 'log:' &&
					<div>
						<b>Elapsed time:&nbsp;</b>{message.elapsedTime} ms
					</div>
				}
				{Object.keys(message.requestHeaders).length > 0 ?
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
					: null}
				{Object.keys(message.responseHeaders).length > 0 ?
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
					: null}
				{queryParams ?
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
					: null}

				{store.getMessage().protocol === 'log:' ?
					typeof responseBody === 'string'
						? <pre>{responseBody}</pre>
						: responseBody
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
				}
				{responseBody === LOADING &&
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
			</React.Fragment>
		</div>
	);

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