import React from 'react';
import Message from '../common/Message';
import { Accordion, AccordionSummary, AccordionDetails } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

type Props = {
	message: Message,
};
const Response = ({ message }: Props) => {
	const queryParams = getQueryParams(message);
	return (
		<div>
			<div className={message.status < 300 ? '' : 'error'}>
				<b>Status:&nbsp;</b>{message.status}
			</div>
			<div>
				<b>Elapsed time:&nbsp;</b>{message.elapsedTime} ms
			</div>
			{ Object.keys(message.requestHeaders).length > 0 ?
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
			{ Object.keys(message.responseHeaders).length > 0 ?
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
			{ queryParams ?
				<Accordion>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<b>Query Parameters:</b>
					</AccordionSummary>
					<AccordionDetails>
						<pre>
							{ JSON.stringify(queryParams, null, 2) }
						</pre>
					</AccordionDetails>
				</Accordion>
			: null}

			<Accordion defaultExpanded={ true }>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<b>Response Data:</b>
				</AccordionSummary>
				<AccordionDetails>
					{ Object.keys(message.requestBody).length > 0 ?
						<pre>
							{getResponseBody(message)}
						</pre>
					: 'No response data'}
				</AccordionDetails>
			</Accordion>
		</div>
	);
}

function getResponseBody(message: Message): string {
	if(typeof message.responseBody === 'object') {
		return JSON.stringify(message.responseBody, null, 2)
	} else {
		return message.responseBody;
	}
}

function getQueryParams(message: Message): string[]|null {
	// Format query parameters
	let queryParams: string[] = [];
	if(message.url!.indexOf('?') !== -1) {
			var temp = message.url!.split('?')[1];
			temp.split('&').forEach(function(param) {
					var keyValue = param.split('=');
					var value = keyValue.length > 1 ? unescape(keyValue[1]) : undefined;
					queryParams.push(keyValue[0]+' = '+value);
			})
	}
	return queryParams.length === 0 ? null : queryParams;
}

export default Response;