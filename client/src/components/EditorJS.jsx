import { Editor } from "prism-react-editor";
import { BasicSetup } from "prism-react-editor/setups";

// Adding the JSX grammar
import "prism-react-editor/prism/languages/jsx";

// Adds comment toggling and auto-indenting for JSX
import "prism-react-editor/languages/jsx";

import "prism-react-editor/layout.css";
import "prism-react-editor/themes/github-dark.css";

// Required by the basic setup
import "prism-react-editor/search.css";
import { jsonLogStore } from "../store/JSONLogStore";

export default function EditorJS() {

	return (
		<Editor language="jsx" value={jsonLogStore.getScript()} onUpdate={(e) => jsonLogStore.setScript(e)}
			style={{ height: '100vh' }}>
			{editor => <BasicSetup editor={editor} />}
		</Editor>
	);
}