import { List, ListItem, Modal } from '@material-ui/core'
import BreakpointStore from '../store/BreakpointStore';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import FilterStore from '../store/FilterStore';

type Props = {
	open: boolean,
	onClose: () => void,
	store: BreakpointStore,
};
const BreakpointModal = observer(({ open, onClose, store }: Props) => {
	const [saveDisabled, setSaveDisabled] = useState(true);

	function close() {
		setSaveDisabled(true);
		store.init();
		onClose();
	}

	function handleSave() {
		store.save();
		close();
	}

	function handleAddBreakpoint() {
		store.extend();
	}

	function handleDeleteBreakpoint(i: number) {
		setSaveDisabled(false);
		store.deleteEntry(i);
	}

	function handleValueChange(e: any, breakpoint: FilterStore) {
		setSaveDisabled(false);
		breakpoint.setFilter(e.currentTarget.value);
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
											opacity: breakpoint.isEnabled() ? 1 : .5,
										}}>
										<div className="no-capture-modal__remove fa fa-minus-circle"
											title="Remove breakpoint"
											onClick={() => handleDeleteBreakpoint(i)}/>
										<button className={`btn ${breakpoint.isEnabled() ? 'btn-danger' : 'btn-success'}`}
											onClick={() => breakpoint.toggleEnabled()}
											title={breakpoint.isEnabled() ? 'Disable breakpoint' : 'Enable breakpoint'}
										>
											{ breakpoint.isEnabled() ? 'Disable' : 'Enable' }
										</button>
										<input className="form-control"
											style={{
												background: !breakpoint.isInvalidFilterSyntax()
													? (breakpoint.getFilter().length > 0 ? 'lightGreen' : undefined)
													: 'lightCoral'
											}}
											placeholder="Take snapshot when breakpoint expression matches any request/response"
											value={breakpoint.getFilter()}
											onChange={(e) => handleValueChange(e, breakpoint)}
										/>
										<div className={`breakpoint__icon ${breakpoint.matchCase() ? 'active' : ''}`}
											title="Match case" onClick={() => breakpoint.toggleMatchCase()}>Aa</div>
										<div className={`breakpoint__icon ${breakpoint.regex() ? 'active' : ''}`}
											title="Use regular expression" onClick={() => breakpoint.toggleRegex()}>.*</div>
										<div className={`breakpoint__icon ${breakpoint.logical() ? 'active' : ''}`}
											title="Use (), &&, ||, !" onClick={() => breakpoint.toggleLogical()}>&&</div>
									</ListItem>
								))}
							</List>
						</div>
					</div>
					<div className="modal-footer">
						<button type="button" className="settings-modal__cancel btn btn-default btn-default"
							onClick={ close }
						>
							Cancel
						</button>
						<button type="button" className="settings-modal__cancel btn btn-default btn-success"
							disabled={saveDisabled}
							onClick={ handleSave }
						>
							Save
						</button>
					</div>
				</div>
			</div>
		</Modal>
	);
});

export default BreakpointModal;