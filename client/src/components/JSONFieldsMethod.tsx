import { FormControlLabel, Radio, RadioGroup } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { jsonLogStore } from "../store/JSONLogStore";

type Props = {};
const JSONFieldsMethods = observer(({ }: Props) => {
    return (
        <>
            <p></p>
            <b>Select Method:</b>
            <RadioGroup
                row
                aria-labelledby="json-log-mode-radio"
                defaultValue='simple'
                name="json-log-mode-radio"
                value={jsonLogStore.getMethod()}
                onChange={(e) => jsonLogStore.setMethod(e.target.value as 'simple' | 'advanced')}
            >
                <FormControlLabel value="simple" control={<Radio />} label="Simple" />
                <FormControlLabel value="advanced" control={<Radio />} label="Advanced" />
            </RadioGroup>
        </>
    );
});

export default JSONFieldsMethods;