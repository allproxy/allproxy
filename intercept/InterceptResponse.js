const url = require('url');

/**
 * Intercept a JSON response, and modify the JSON body as needed.
 *
 * @param string clientReq
 * @param object json
 * @returns modified JSON object or null
 */
module.exports = function InterceptJsonResponse(clientReq, json) {
    const reqUrl = url.parse(clientReq.url);
    const path = reqUrl.pathname;
    const query = reqUrl.query;

    /**
     * Add your code here to modify the JSON response body
     */
    // if (path === '/aaa/bbb') {
    //     json.addMyField = 1;
    //     return json;
    // }

    return null; // do not modify JSON response body
}
