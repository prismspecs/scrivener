import { v5 as uuidv5 } from 'uuid';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import axios from 'axios';
import fs from 'fs';

export function generateUUID(text) {

    // namespace UUID (you can use any UUID here)
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    // generate the UUID based on the namespace and the text
    const result = uuidv5(text, namespace);

    return result;
}

export function unpinAllMessages(client, channelId) {
    // get all pinned messages in the channel
    client.channels.fetch(channelId).then(channel => {
        channel.messages.fetchPinned().then(messages => {
            // unpin each message
            messages.forEach(message => {
                message.unpin();
            });
        });
    });
}

export function announce(text) {
    const announceEmbed = quickEmbed("Announcement", text, 0xFFFFFF);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [announceEmbed] });
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

export function splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
        let endIndex = startIndex + maxLength;
        if (endIndex >= text.length) {
            // Last chunk
            chunks.push(text.substring(startIndex));
            break;
        }
        // Find the nearest newline character before the end index
        const nearestNewline = text.lastIndexOf('\n', endIndex);
        if (nearestNewline !== -1 && nearestNewline > startIndex) {
            // Break at nearest newline
            endIndex = nearestNewline;
        }
        // Extract chunk
        chunks.push((chunks.length > 0 ? ' ឵឵឵ ' : '') + text.substring(startIndex, endIndex));
        // Move start index to the next character after the newline
        startIndex = endIndex + 1;
    }

    return chunks;
}


export function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function quickEmbed(title, description, color, image = null) {

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);

    if (image) {
        embed.setImage("attachment://" + image);
    }

    // message.channel.send({ embeds: [embed] });

    return embed;

}

export async function showFactions(message, config) {

    const theFactions = loadFromJSON('data/factions.json');

    // for each faction
    for (const faction of theFactions) {
        const factionImage = new AttachmentBuilder(`${config.imageFolder}/factions/${faction.image}`).setName("faction.jpg");

        // create an embed with the faction's name and description and image
        const embed = new EmbedBuilder()
            .setTitle(faction.name)
            .setDescription(faction.description)
            .setImage("attachment://faction.jpg")
            .setColor(faction.color || 0xFFFF00);

        // send the embed to the channel
        //message.channel.send({ embeds: [embed], files: [factionImage], ephemeral: true });
        // send it as a DM to the user
        message.author.send({ embeds: [embed], files: [factionImage] });

    }

    // send ephemeral message to the channel
    message.reply({ content: "I've send information on the factions to your DMs.", ephemeral: true });

    // send it as regular messages to the channel instead of embeds, but use images
    // const theFactions = loadFromJSON('data/factions.json');

    // // for each faction
    // for (const faction of theFactions) {
    //     const factionImagePath = `${config.imageFolder}/factions/${faction.image}`;
    //     if (!fs.existsSync(factionImagePath)) {
    //         console.error(`Image file not found: ${factionImagePath}`);
    //         continue;
    //     }

    //     const factionImage = new AttachmentBuilder(factionImagePath).setName(`${faction.name}.jpg`);

    //     // send the faction's name and description as a regular message
    //     message.channel.send({ content: `**${faction.name}**\n${faction.description}`, files: [factionImage] });
    // }

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