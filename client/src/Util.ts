import Message from './common/Message';

export default class Util {

	static fixNewlines(str: string) {
        return str.replace(/\\n/g, '\n') // fix up line breaks
                  .replace(/\\/g, '')
                  .replace(/""/g, '"'); // remove consecutive quotes
	}

    static isGraphQlError(message: Message) {
        if ((message.url?.endsWith('/graphql') || message.url?.endsWith('/graphql-public'))
            && Array.isArray(message.responseBody)) {
            for(const entry of message.responseBody) {
                if(entry.errors) {
                   return true;
                }
            }
        }
        return false;
    }

}