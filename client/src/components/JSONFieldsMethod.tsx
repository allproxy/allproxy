import { FormControlLabel, Radio, RadioGroup } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { jsonLogStore } from "../store/JSONLogStore";
import JSONFieldsSample from "./JSONFieldsSample";

type Props = {};
const JSONFieldsMethods = observer(({ }: Props) => {
    return (
        <>
            <p />
            <b>UI Entry Layout:</b>
            <div style={{ marginLeft: '.5rem' }}>
                <JSONFieldsSample />
            </div>
            <p></p>
            <b>Select Method:</b>
            <RadioGroup
                row
                aria-labelledby="json-log-mode-radio"
                defaultValue='auto'
                name="json-log-mode-radio"
                value={jsonLogStore.getMethod()}
                onChange={(e) => jsonLogStore.setMethod(e.target.value as 'auto' | 'simple' | 'advanced')}
            >
                <FormControlLabel value="auto" control={<Radio />} label="Auto" />
                <FormControlLabel value="simple" control={<Radio />} label="Simple" />
                <FormControlLabel value="advanced" control={<Radio />} label="Advanced" />
            </RadioGroup>
        </>
    );
});

export default JSONFieldsMethods;