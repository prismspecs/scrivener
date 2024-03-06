import axios from 'axios';

import dotenv from 'dotenv'
dotenv.config()

import { Client, GatewayIntentBits, Partials } from 'discord.js';
const client = new Client({
    'intents': [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    'partials': [Partials.Channel]
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Ready!');
});

process.on('uncaughtException', (err) => {
    console.log('General error:', err.message);
    console.log(err);
});

client.on('messageCreate', async (message) => {
    // Log the message content
    console.log(message.content);

    // create a variable and prepend a prefix to the message
    const newMessage = `Make sure to respond with fewer than 2000 characters to this: ${message.content}`;

    // Check if the message is not from a bot to avoid an infinite loop
    if (!message.author.bot) {
        try {
            // Make the HTTP request to the specified endpoint
            const response = await axios.post('http://localhost:11434/api/chat', {
                model: 'mistral',
                stream: false,
                messages: [{ role: 'user', content: newMessage }]
            });

            // Extract only the 'content' property from the response
            const content = response.data.message.content;

            // Send the 'content' back to the Discord channel
            message.reply(`Model Response: ${content}`);

        } catch (error) {
            console.error('Error making HTTP request:', error.message);
            message.reply('An error occurred while processing your request.');
        }
    }

    // Check if the message starts with the prefix
    if (message.content.startsWith('!ping')) {
        // Send the message to the same channel
        message.channel.send('Pong.');
    }
});

client.login(process.env.DISCORD_TOKEN);

