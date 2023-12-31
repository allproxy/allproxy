import { observer } from "mobx-react-lite";
import Request from './Request';
import MessageStore from "../store/MessageStore";
import { newJSONMessage } from "../ImportJSONFile";
import { pickLabelStyle } from "../PickButtonStyle";

type Props = {};
const JSONFieldsSample = observer(({ }: Props) => {
    const json = {
        level: 'level',
        time: Date.now(),
        category: "category",
        appName: 'app-name',
        message: 'Message text',
        field1: 'value1',
        field2: 'value2',
    };
    let message = newJSONMessage('', json);
    const messageStore = new MessageStore(message, true);
    pickLabelStyle('x');
    pickLabelStyle('y');
    return (
        <Request
            maxStatusSize={0}
            maxMethodSize={0}
            maxEndpointSize={0}
            store={messageStore}
            key={0}
            isActive={false}
            highlight={false}
            onClick={() => { }}
            onDelete={() => { }}
            onResend={() => { }}
            vertical={true}
            isFiltered={false}
            className={'request__msg-even'}
            doHighlight={() => { }}
        />
    );
});

export default JSONFieldsSample;