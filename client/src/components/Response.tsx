import React from 'react';
import Message from '../common/Message';
import { Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

type Props = {
	message: Message,
};
const Response = ({ message }: Props) => {
	const [responseBody, setResponseBody] = React.useState('');

	const queryParams = getQueryParams(message);
	getResponseBody(message)
		.then((rb) => setResponseBody(rb));
	return (
		<div>
			<React.Fragment>
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

				<Accordion defaultExpanded={true}>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<b>Response Data:</b>
					</AccordionSummary>
					<AccordionDetails>
						<pre>
							{responseBody}
						</pre>
					</AccordionDetails>
				</Accordion>
				{responseBody.length === 0 &&
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

	async function getResponseBody(message: Message): Promise<string> {
		return new Promise<string>((resolve) => {
			let response = '';
			if(typeof message.responseBody === 'object') {
				response = JSON.stringify(message.responseBody, null, 2);
			} else {
				response = message.responseBody;
			}
			setTimeout(() => resolve(response));
		});
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