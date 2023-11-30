import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { pickLabelStyle } from '../PickButtonStyle';
import pickIcon from '../PickIcon';
import { updateJSONRequestLabels } from '../store/JSONLogStore';
import MessageQueueStore from '../store/MessageQueueStore';
import { mainTabStore } from '../store/MainTabStore';

const HIDE_JSON_FIELD_BUTTONS = true;

export const JSONFieldButtonsHeight = HIDE_JSON_FIELD_BUTTONS ? 0 : 40;

/**
 * JSON Fields
 */
type Props = {
	messageQueueStore: MessageQueueStore
};
const JSONFieldButtons2 = observer(({ messageQueueStore }: Props): JSX.Element | null => {

	useEffect(() => {
		messageQueueStore.updateJSONFields(mainTabStore.getSelectedTabName(), messageQueueStore.getMessages());
	}, [messageQueueStore]);

	if (HIDE_JSON_FIELD_BUTTONS || mainTabStore.getJsonFields(mainTabStore.getSelectedTabName()).length === 0 || messageQueueStore.getMessages().length === 0) return null;

	const iconColor = messageQueueStore.getMessages()[0].getColor();
	const jsonFields = mainTabStore.getJsonFields(mainTabStore.getSelectedTabName());
	return (
		<div style={{
			maxHeight: `calc(${JSONFieldButtonsHeight}px)`,
			overflowY: 'auto'
		}}>

			<div className={pickIcon('log:')}
				style={{ color: iconColor, margin: '0 .5rem' }}></div>
			{
				jsonFields.map((field, i) => (
					<span style={{ whiteSpace: "nowrap" }}>
						<button className={"btn btn-sm " + (field.selected ? "" : "btn-secondary")}
							key={field.name}
							style={field.selected ?
								{ margin: ".5rem 0", marginRight: ".25rem", background: pickLabelStyle(field.name).background, color: pickLabelStyle(field.name).color, filter: pickLabelStyle(field.name).color } :
								{ margin: ".5rem .25rem" }}
							onClick={() => {
								mainTabStore.setUpdating(true);
								jsonFields[i].selected = !jsonFields[i].selected;
								setTimeout(() => {
									updateJSONRequestLabels();
									mainTabStore.setUpdating(false);
								});
							}}
						>
							{field.name}
						</button>
					</span>
				))
			}
		</div >
	);
});

function JSONFieldButtons(messageQueueStore: MessageQueueStore) {
	return <JSONFieldButtons2 messageQueueStore={messageQueueStore}></JSONFieldButtons2>;
}

export default JSONFieldButtons;