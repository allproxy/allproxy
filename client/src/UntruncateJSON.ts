import { isInteger } from "lodash";

export function untruncateJson(json: string): string {
    const stack: string[] = [];

    function fix() {
        let missingChars: string[] = [];
        let endQuote = '';
        while (stack.length > 0) {
            const c = stack.pop();
            switch (c) {
                case '{':
                    missingChars.push('}');
                    break;
                case '[':
                    missingChars.push(']');
                    break;
                case '"':
                    endQuote = '"';
                    break;
            }
        }
        //console.log('fix', endQuote, missingChars);

        if (missingChars.length > 0) {
            json += endQuote; // add missing quote
            json = json.trim();
            const endChar = json.substring(json.length - 1); // end char
            if (endChar !== ',' && endChar !== '[' && endChar !== ']' && endChar !== '{' && endChar !== '}') {
                // Find start of last field
                let s = -1;
                for (let i = json.length - 1; i > 0; --i) {
                    const c = json.substring(i, i + 1);

                    // Delimiter?
                    if (c === ',' || c === '{' || c === '[') {
                        if (c === ',') {
                            const prev = json.substring(i - 1, i);
                            if (prev !== '"' && prev !== '}' && prev !== ']') {
                                const value = json.substring(json.substring(0, i).lastIndexOf(':') + 1, i);
                                if (value !== 'true' && value !== 'false' && !isInteger(value)) {
                                    continue;
                                }
                            }
                        }
                        s = i + 1;
                        break;
                    }
                }
                if (s !== -1) {
                    const field = json.substring(s).trim();
                    //console.log('last field', field);
                    json = json.substring(0, s); // remove field

                    // Field doesn't start with expected "?
                    if (!field.startsWith('"')) {
                        json += '"' + field + '": "..."';
                        //console.log("Doesn't start with quote")
                    } else {
                        // Colon is missing?
                        const i = field.indexOf(':', field.indexOf('"', 1));
                        if (i === -1) {
                            json += field + ': "..."';
                            //console.log('Colon is missing');
                        } else {
                            let key = field.substring(0, i);
                            let value = field.substring(i + 1).trim();
                            if (value.substring(0, 1) === '"') {
                                //console.log('value starts with quote')
                                json += key + ':' + value;
                                if (!value.endsWith('"')) {
                                    json += '"';
                                    //console.log('add closing quote')
                                }
                            } else {
                                if (value !== 'true' && value !== 'false' && !isInteger(value)) {
                                    //console.log('add quotes')
                                    json += key + ': "' + value + '"';
                                } else {
                                    json += key + ':' + value;
                                    //console.log('add ', value);
                                }
                            }
                        }
                    }
                }
            }
            if (json.substring(json.length - 1) === ',') {
                json = json.substring(json.length - 2); // remove comma
            }
            json += missingChars.join('');
        }
        //console.log(JSON.parse(json));
    }

    for (let i = 0; i < json.length; ++i) {
        const c = json.substring(i, i + 1);
        if (stack.length > 0 && stack[stack.length - 1] === '"') {
            if (c === '"') {
                stack.pop();
            }
            continue;
        }
        switch (c) {
            case '"':
                stack.push('"');
                break;
            case '{':
                stack.push(c);
                break;
            case '}':
                if (stack.length > 0) {
                    if (stack[stack.length - 1] === '{') {
                        stack.pop();
                    } else {
                        fix();
                        return json;
                    }
                }
                break;
            case '[':
                stack.push(c);
                break;
            case ']':
                if (stack.length > 0) {
                    if (stack[stack.length - 1] === '[') {
                        stack.pop();
                    } else {
                        fix();
                        return json;
                    }
                }
                break;
        }
        //console.log(stack);
    }
    fix();
    return json;
}