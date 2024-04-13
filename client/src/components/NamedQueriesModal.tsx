import { FormControlLabel, IconButton, List, ListItem, Modal, Radio, RadioGroup } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import FilterStore from '../store/FilterStore';
import CloseIcon from "@material-ui/icons/Close";
import NamedQueriesStore, { namedQueriesStore } from '../store/NamedQueriesStore';
import { urlPathStore } from '../store/UrlPathStore';
import { isJsonLogTab } from './SideBar';

type Props = {
	name: string,
	open: boolean,
	onClose: () => void,
	store: NamedQueriesStore,
};
const NamedQueriesModal = observer(({ name, open, onClose, store }: Props) => {

	function close() {
		namedQueriesStore.setLogType(isJsonLogTab() ? 'json' : 'proxy');
		onClose();
	}

	function handleAddQuery() {
		store.extend();
	}

	function handleDeleteQuery(i: number) {
		store.deleteEntry(i);
		store.changed();
	}

	function handleQueryChange(e: any, query: FilterStore) {
		query.setFilter(e.currentTarget.value);
		store.changed();
	}

	function handleNameChange(e: any, query: FilterStore) {
		query.setName(e.currentTarget.value);
		store.changed();
	}

	return (
		store ?
			<Modal
				className="modal-window"
				open={open}
				onClose={close}
				aria-labelledby="simple-modal-title"
				aria-describedby="simple-modal-description"
			>
				<div className="breakpoint-modal" role="dialog">
					<div>
						<h3>{name}</h3>
						<div style={{ borderTop: 'solid steelblue', paddingTop: '.5rem' }}>
							<div className="no-capture-modal__scroll-container">
								{urlPathStore.getKind() === 'allproxy' &&
									<RadioGroup
										row
										aria-labelledby="json-log-mode-radio"
										defaultValue='auto'
										name="named-queries-radio"
										value={namedQueriesStore.getLogType()}
										onChange={(e) => namedQueriesStore.setLogType(e.target.value as 'proxy' | 'json')}
									>
										<FormControlLabel value="proxy" control={<Radio />} label="Proxy Log" />
										<FormControlLabel value="json" control={<Radio />} label="JSON Log" />

									</RadioGroup>
								}
								<button className="btn btn-lg btn-primary"
									onClick={handleAddQuery}
								>
									+ New Query
								</button>
								<List>
									{store.getAllQueries().map((query, i) => (
										<ListItem key={i}
											style={{
												display: 'flex', alignItems: 'center',
											}}>
											<IconButton onClick={() => handleDeleteQuery(i)} title="Delete query">
												<CloseIcon style={{ color: 'red' }} />
											</IconButton>
											<div>
												<input className="form-control"
													placeholder="Query Name"
													value={query.getName()}
													onChange={(e) => handleNameChange(e, query)}
													style={{ width: '160px' }}
												/>
											</div>
											<div
												style={{
													marginLeft: '.5rem',
													display: 'flex', alignItems: 'center',
													width: '100%',
												}}
											>
												<input className="form-control"
													style={{
														background: !query.isInvalidFilterSyntax()
															? undefined
															: 'lightCoral'
													}}
													disabled={query.isEnabled() ? false : true}
													placeholder="Boolean Query"
													value={query.getFilter()}
													onChange={(e) => handleQueryChange(e, query)}
												/>
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
			: null
	);
});

export default NamedQueriesModal;