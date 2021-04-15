import Message from './common/Message';

export default class Util {

	static fixNewlines(str: string) {
        return (str as any).replaceAll('\\n', '\n') // fix up line breaks
                  .replaceAll('\\', '')
                  .replaceAll('""', '"'); // remove consecutive quotes
	}

	static isGraphQlError(message: Message) {
        if(message.url === '/graphql' && Array.isArray(message.responseBody)) {
            for(const entry of message.responseBody) {
                if(entry.errors) {
                   return true;
                }
            }
        }
        return false;
    }

}