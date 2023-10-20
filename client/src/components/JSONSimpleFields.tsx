import { TextField } from "@material-ui/core";
import { observer } from "mobx-react-lite";
import { jsonLogStore } from "../store/JSONLogStore";

type Props = {};
const JSONSimpleFields = observer(({ }: Props) => {
    return (
        <>
            Simply define the field names for the date, level, app name and message field.
            <p></p>
            < form noValidate autoComplete='off' >
                <TextField
                    id="json-date"
                    style={{ marginBottom: 16 }}
                    label="Enter Date Field"
                    variant='outlined'
                    fullWidth
                    value={jsonLogStore.getSimpleFields().date}
                    onChange={(e) => jsonLogStore.setSimpleFields('date', e.target.value)}
                />
                <TextField
                    id="json-lavel"
                    style={{ marginBottom: 16 }}
                    label="Enter Level Field"
                    variant='outlined'
                    fullWidth
                    value={jsonLogStore.getSimpleFields().level}
                    onChange={(e) => jsonLogStore.setSimpleFields('level', e.target.value)}
                />
                <TextField
                    id="json-app"
                    style={{ marginBottom: 16 }}
                    label="Enter Category (optional)"
                    variant='outlined'
                    fullWidth
                    value={jsonLogStore.getSimpleFields().category}
                    onChange={(e) => jsonLogStore.setSimpleFields('category', e.target.value)}
                />
                <TextField
                    id="json-app"
                    style={{ marginBottom: 16 }}
                    label="Enter App Name Field"
                    variant='outlined'
                    fullWidth
                    value={jsonLogStore.getSimpleFields().appName}
                    onChange={(e) => jsonLogStore.setSimpleFields('appName', e.target.value)}
                />
                <TextField
                    id="json-message"
                    style={{ marginBottom: 16 }}
                    label="Enter Message Field"
                    variant='outlined'
                    fullWidth
                    value={jsonLogStore.getSimpleFields().message}
                    onChange={(e) => jsonLogStore.setSimpleFields('message', e.target.value)}
                />
            </form >
        </>
    );
});

export default JSONSimpleFields;