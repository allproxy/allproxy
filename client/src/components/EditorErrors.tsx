import { observer } from "mobx-react-lite";
import jshint from 'jshint';
import { jsonLogStore } from "../store/JSONLogStore";

const EditorErrors = observer(() => {

	const ignore = ['W104', 'W119', 'W069', 'W082'];

	function getScriptErrors() {
		var options = {
			undef: true
		};
		const errors = jshint.JSHINT(jsonLogStore.getScript(), options);
		if (!errors) {
			let errors = [];
			for (const error of jshint.JSHINT.errors) {
				if (ignore.includes(error.code)) continue;
				errors.push(error.line + ': ' + error.code + ' ' + error.reason);
			}
			return errors;
		} else {
			return [];
		}
	}

	return (
		<div style={{ marginLeft: '.5rem' }}>
			{
				getScriptErrors().map(error => (<div style={{ marginBottom: '.5rem' }}>{error}</div>))
			}
		</div>
	);
});

export default EditorErrors;