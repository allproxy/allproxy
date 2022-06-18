import { observer } from 'mobx-react-lite';
import { Dialog, DialogTitle } from '@material-ui/core';

type Props = {
	open: boolean,	
	onClose: () => void,
};

const HelpDialog = observer(({ open, onClose }: Props) => {
	
	const handleClose = () => {
		onClose();
	}

	return (
		<Dialog onBackdropClick={handleClose} maxWidth={'lg'} onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
			<DialogTitle id="simple-dialog-title"><b>AllProxy Help</b></DialogTitle>
			<div style={{				
				paddingBottom: "2rem",
				paddingLeft: "1.5rem",
				paddingRight: "1rem"
			}}>
				<b>AllProxy started on localhost:8888</b>
				<p></p>
				<ol style={{paddingLeft: "1rem"}}>
				<li>
					<b>Trust AllProxy certificate:</b>
					<br></br>
					Run the <strong>~/allproxy/bin/trustCert.sh enable</strong> script in your terminal.
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
						- Run the <b>~/allproxy/bin/systemProxy.sh enable</b> script in your terminal.
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

export default HelpDialog;