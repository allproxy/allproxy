import { useState } from 'react';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import { filterStore } from '../store/FilterStore';
import GTag from '../GTag';

export default function HighlightTags() {
	const [tags, setTags] = useState<string[]>([]);

	function handleChange(tags: string[]) {
		setTags(tags);
		filterStore.setHighlightTerms(tags);
		GTag.search(tags.toString());
	}

	return (
		<TagsInput
			value={tags}
			onChange={handleChange}
		/>
	);
}