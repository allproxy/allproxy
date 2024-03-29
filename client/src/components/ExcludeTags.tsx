import { useState } from 'react';
import TagsInput from 'react-tagsinput';
import 'react-tagsinput/react-tagsinput.css';
import { filterStore } from '../store/FilterStore';

export default function ExcludeTags() {
	const [tags, setTags] = useState<string[]>([]);

	function handleChange(tags: string[]) {
		setTags(tags);
		filterStore.setExcludeTags(tags);
	}

	return (
		<TagsInput
			value={tags}
			onChange={handleChange}
		/>
	);
}