import { useState } from 'react';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import { filterStore } from '../store/FilterStore';

export default function HighlightTags() {
	const [tags, setTags] = useState<string[]>([]);

	function handleChange(tags: string[]) {
		setTags(tags);
		filterStore.setHighlightTerms(tags);
	}

	return (
		<TagsInput
			value={tags}
			onChange={handleChange}
		/>
	);
}