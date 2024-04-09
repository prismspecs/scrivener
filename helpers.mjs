import { v5 as uuidv5 } from 'uuid';
import axios from 'axios';

export function generateUUID(text) {

    // namespace UUID (you can use any UUID here)
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    // generate the UUID based on the namespace and the text
    const result = uuidv5(text, namespace);

    return result;
}

export async function promptOllama(prompt, prepend, append) {
    // make the HTTP request to the specified endpoint
    const response = await axios.post('http://localhost:11434/api/chat', {
        model: 'mistral',
        stream: false,
        messages: [{ role: 'user', content: `${prepend} ${prompt} ${append}` }]
    });

    // extract only the 'content' property from the response
    return response.data.message.content;
}

export function removeCommandPrefix(message) {
    return message.replace(/![a-zA-Z]+\s/g, '');
}