import { List, ListItem, Modal } from '@material-ui/core'
import BreakpointStore from '../store/BreakpointStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import FilterStore from '../store/FilterStore';

type Props = {
	open: boolean,
	onClose: () => void,
	store: BreakpointStore,
};
const BreakpointModal = observer(({ open, onClose, store }: Props) => {
	useEffect(() => {
		store.editing(open);
	})

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
		breakpoint.setFilterNoDebounce(e.currentTarget.value);
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
					<h3>Breakpoint List</h3>
					<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
						<div className="no-capture-modal__scroll-container">
							<div>When a request/response matches a breakpoint, a snapshot is created
								and the breakpoint is disabled.  The breakpoint only fires one time,
								and can be reenabled as needed.
							</div>
							<div>(The list is stored in browser local storage.)</div>
							<div className="no-capture-modal__add-button fa fa-plus-circle"
								onClick={handleAddBreakpoint}>
								&nbsp;Add breakpoint
							</div>
							<List>
								{store.getBreakpointList().map((breakpoint, i) => (
									<ListItem key={i}
										style={{
											display: 'flex', alignItems: 'center',
										}}>
										<div className="no-capture-modal__remove fa fa-minus-circle"
											title="Remove breakpoint"
											onClick={() => handleDeleteBreakpoint(i)}/>
										<button className={`btn ${breakpoint.isEnabled() ? 'btn-primary' : 'btn-secondary'}`}
											onClick={() => handleToggleEnable(breakpoint)}
											title={breakpoint.isEnabled() ? 'Disable breakpoint' : 'Enable breakpoint'}
										>
											{ breakpoint.isEnabled() ? 'Disable' : 'Enable' }
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
												placeholder="Take snapshot when breakpoint expression matches any request/response"
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
						<button type="button" className="settings-modal__cancel btn btn-default btn-success"
							onClick={ close }
						>
							Done
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default BreakpointModal;