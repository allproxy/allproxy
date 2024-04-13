"use strict";
// Function called to extract date, level, kind and message
//
// @param preJSONString: string - optional non-JSON string proceeding JSON object
// @param jsonObject: {} - JSON log data
// @returns {date: Date, level: string, category: string, kind: string, message: string, additionalJSON: {} }
//
// category is the availability zone, processor...
// kind could be a pod name, object kind, process ID...
//
function parseJSON(preJSONString, jsonObject) {
    let level = 'info';
    let date = new Date();
    let category = '';
    let kind = 'Kind_is_not_set';
    let message = 'Message is not set - edit or replace client/public/parsejson/plugin.js';
    // return raw JSON (optional)
    let rawLine;
    // Copy any JSON fields not defined in jsonObject
    let additionalJSON = {};

    // Set the level
    // level = jsonObject.m_level;

    // Set the date
    // date = jsonObject.my_date;

    // Set the kind
    //kind = jsonObject.my_kind;

    // Set message
    //message = jsonObject.my_message;

    return { date, level, category, kind, message, rawLine, additionalJSON };
}
