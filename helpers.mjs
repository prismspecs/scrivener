import { v5 as uuidv5 } from 'uuid';
import axios from 'axios';
import fs from 'fs';

export function generateUUID(text) {

    // namespace UUID (you can use any UUID here)
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    // generate the UUID based on the namespace and the text
    const result = uuidv5(text, namespace);

    return result;
}

export async function promptOllama(prompt, prepend, append) {

    try {
        // make the HTTP request to the specified endpoint
        const response = await axios.post('http://localhost:11434/api/chat', {
            model: 'mistral',
            stream: false,
            messages: [{ role: 'user', content: `${prepend} ${prompt} ${append}` }]
        });

        // extract only the 'content' property from the response
        return response.data.message.content;

    } catch (error) {
        console.error('Error making HTTP request:', error.message);
        message.reply('An error occurred while processing your request.');

        return null;
    }

}

export async function summarize(text) {
    return await promptOllama(text, '', 'Summarize the facts in one or two sentences.');
}

export function removeCommandPrefix(message) {
    // gets rid of the !command part of the message
    return message.replace(/![a-zA-Z]+\s/g, '');
}

export function loadFromJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (err) {
        console.log("Could not load data from JSON file:", filePath);
        return {};
    }
}

export function saveToJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (err) {
        console.log("Could not save data to JSON file:", filePath);
    }
}