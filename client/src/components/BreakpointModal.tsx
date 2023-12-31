import { IconButton, List, ListItem, Modal } from '@material-ui/core';
import BreakpointStore from '../store/BreakpointStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import FilterStore from '../store/FilterStore';
import CloseIcon from "@material-ui/icons/Close";

type Props = {
	open: boolean,
	onClose: () => void,
	store: BreakpointStore,
};
const BreakpointModal = observer(({ open, onClose, store }: Props) => {
	useEffect(() => {
		store.editing(open);
	});

	function close() {
		onClose();
	}

	function handleAddBreakpoint() {
		store.extend();
	}

	function handleDeleteBreakpoint(i: number) {
		store.deleteEntry(i);
		store.changed();
	}

	function handleToggleEnable(breakpoint: FilterStore) {
		breakpoint.toggleEnabled();
		store.changed();
	}

	function handleValueChange(e: any, breakpoint: FilterStore) {
		breakpoint.setFilter(e.currentTarget.value);
		store.changed();
	}

	function handleMatchCase(breakpoint: FilterStore) {
		breakpoint.toggleMatchCase();
		store.changed();
	}

	function handleRegex(breakpoint: FilterStore) {
		breakpoint.toggleRegex();
		store.changed();
	}

	function handleLogical(breakpoint: FilterStore) {
		breakpoint.toggleLogical();
		store.changed();
	}

	return (
		<Modal
			className="modal-window"
			open={open}
			onClose={close}
			aria-labelledby="simple-modal-title"
			aria-describedby="simple-modal-description"
		>
			<div className="breakpoint-modal" role="dialog">
				<div>
					<h3>Breakpoints</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="no-capture-modal__scroll-container">
							<h5>
								Set breakpoints to allow the JSON response body to be modified before it is forwarded back to the client.
							</h5>
							<ul>
								<li>
									A modal will pop up when the breakpoint matches any part of the request or response.
								</li>
								<li>
									Matching on the request URL and optional query parameters can uniquely identify a specific request.
								</li>
								<li>
									Logical expressions can be used to match, for example: https://example.com/v1/abc && param1=true
								</li>
								<li>
									Only responses with Content-Type application/json are examined.
								</li>
							</ul>
							<button className="btn btn-lg btn-primary"
								onClick={handleAddBreakpoint}
							>
								+ New Breakpoint
							</button>
							<List>
								{store.getBreakpointList().map((breakpoint, i) => (
									<ListItem key={i}
										style={{
											display: 'flex', alignItems: 'center',
										}}>
										<IconButton onClick={() => handleDeleteBreakpoint(i)} title="Delete breakpoint">
											<CloseIcon style={{ color: 'red' }} />
										</IconButton>
										<button className={`btn ${breakpoint.isEnabled() ? 'btn-success' : 'btn-secondary'}`}
											onClick={() => handleToggleEnable(breakpoint)}
											title={breakpoint.isEnabled() ? 'Disable breakpoint' : 'Enable breakpoint'}
										>
											{breakpoint.isEnabled() ? 'Disable' : 'Enable'}
										</button>
										<div
											style={{
												display: 'flex', alignItems: 'center',
												width: '100%',
											}}
										>
											<input className="form-control"
												style={{
													background: !breakpoint.isInvalidFilterSyntax()
														? undefined
														: 'lightCoral'
												}}
												disabled={breakpoint.isEnabled() ? false : true}
												placeholder="Match on any part of the request (e.g., url) or response"
												value={breakpoint.getFilter()}
												onChange={(e) => handleValueChange(e, breakpoint)}
											/>
											<div className={`breakpoint__icon ${breakpoint.matchCase() ? 'active' : ''}`}
												title="Match case" onClick={() => handleMatchCase(breakpoint)}>Aa</div>
											<div className={`breakpoint__icon ${breakpoint.regex() ? 'active' : ''}`}
												title="Use regular expression" onClick={() => handleRegex(breakpoint)}>.*</div>
											<div className={`breakpoint__icon ${breakpoint.logical() ? 'active' : ''}`}
												title="Use (), &&, ||, !" onClick={() => handleLogical(breakpoint)}>&&</div>
										</div>
									</ListItem>
								))}
							</List>
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-success"
							onClick={close}
						>
							Ok
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default BreakpointModal;