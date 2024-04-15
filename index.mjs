// to do: combine players and balances

import fs from 'fs';    // filesystem for JSON stuff
import axios from 'axios';
import dotenv from 'dotenv'
import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder, ButtonStyle } from 'discord.js';
//import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder } from 'discord.js';   // voting
import { commands, setupCommands } from './commands.mjs';
import { initiateVote, handleInteractionCreate } from './voting.mjs';
import { generateUUID, promptOllama, removeCommandPrefix, summarize, loadFromJSON, saveToJSON } from './helpers.mjs';
import { RateLimiter } from 'discord.js-rate-limiter';

// allows 1 command every x seconds
const rateLimiter = new RateLimiter(1, 2000);

// all the game data files
let game = loadFromJSON(`${config.dataFolder}/game.json`);
let balances = loadFromJSON(`${config.dataFolder}/balances.json`);
let proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);
let players = loadFromJSON(`${config.dataFolder}/players.json`);
const config = loadFromJSON(`${config.dataFolder}/config.json`);
const admins = loadFromJSON(`${config.dataFolder}/admins.json`);
let history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);

// make sure to enable all required intents
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


dotenv.config()

// commands (not working atm)
// from https://cratecode.com/info/discordjs-slash-commands
setupCommands(client);

const commandList = [
    '!generate [text] - Generate text based on the input.',
    '!ping - Pong!',
    '!dispatch - Create a new dispatch.',
    '!howto - Get information on how to play the game.',
    '!propose [text] - Propose an idea.',
    '!vote [duration] [title] - Create a vote.',
    '!balance - Check your balance.',
    '!advice - Get advice.',
    '!add - Add yourself to the game.'
];


// when the client is ready
client.once('ready', () => {

    // set avatar
    // client.user.setAvatar('images/we-logo.png');

    console.log('Ready!');

    // replace 'SERVER/GUILD_ID' and 'CHANNEL_ID' with your actual guild and channel IDs
    const guild = client.guilds.cache.get(config.SERVER_ID);
    if (!guild) return console.log('Unable to find the guild.');

    const channel = guild.channels.cache.get(config.CHANNEL_ID);
    if (!channel) return console.log('Unable to find the channel.');

    channel.send('Bot has started up!');

});

// general error handling
process.on('uncaughtException', (err) => {
    console.log('General error:', err.message);
    console.log(err);
});

client.on('messageCreate', async (message) => {

    // if message begins with "!"
    if (message.content.startsWith('!')) {

        // check rate limit and return if the user is sending messages too quickly
        if (rateLimiter.take(message.author.id)) {
            message.reply('You are sending messages too quickly.');
            return;
        }

        // log the message content noting the user, plus a new line character
        console.log(`Message from ${message.author.username}: ${message.content}\n`);
    }

    // check message !command prefix
    if (message.content.startsWith('!generate')) {
        generateTextTest(message);
    }
    else if (message.content.startsWith('!ping')) {
        // send the message to the same channel
        //message.channel.send('Pong.');
        // Send an ephemeral message in a slash command reply
        message.reply({ content: "Your anger is a gift", ephemeral: true });

    }
    else if (message.content.startsWith('!dispatch')) {
        // create a dispatch
        generateDispatch(message);

    }
    else if (message.content.startsWith('!howto')) {
        const welcomeMessage = "Each player begins with digital currency for a DAO established by the four factions in order to build a new world on the principles of self-determination, environmentalism, and egalitarianism. The currency can be pledged to advance projects which respond to material conditions within the game. If your proposal wins the voting round you earn all of the pledged currency. If you lose, you lose all of the pledged currency. The accepted proposal will alter the course of the game world and thus future situations and proposals.\n\nSome helpful commands:\n\n";
        const commandListString = commandList.join('\n');
        //message.channel.send(`${welcomeMessage}${commandListString}\n\nGood luck!`);
        message.reply({ content: `${welcomeMessage}${commandListString}\n\nGood luck!`, ephemeral: true });

    }
    else if (message.content.startsWith('!propose')) {
        if (game.state !== 'proposal') {
            message.reply('Proposals are not allowed at this time. Please wait for the next dispatch.');
            return;
        }

        propose(message);

    }
    else if (message.content.startsWith('!vote')) {

        if (game.state !== 'voting') {
            message.reply('Voting is not allowed at this time. Please wait until the proposal period is over.');
            return;
        }

        initiateVote(message);
        client.on('interactionCreate', handleInteractionCreate);

    }
    else if (message.content.startsWith('!balance')) {
        // check the balance of the user in the balances.json file and send to server
        let username = message.author.username;
        let balance = balances[message.author.id];
        message.channel.send(`${username}, your balance is ${balance} ${config.currency}`);
    }
    else if (message.content.startsWith('!advice')) {
        advice(message);
    }
    else if (message.content.startsWith('!add')) {
        // add user to the game and include them in players.json, and give them 100 credits, but only if they're not already in the game
        if (!(message.author.id in balances)) {
            balances[message.author.id] = 100;

            // message to channel welcoming player
            let username = message.author.username;
            message.channel.send(`Welcome to the game, ${username}. The DAO has allocated you 100 ${config.currency} based on your tuition.`);

            // save the balances to the file
            fs.writeFileSync(`${config.dataFolder}/balances.json`, JSON.stringify(balances));

            // save player to players.json
            players[message.author.id] = message.author.username;
            fs.writeFileSync(`${config.dataFolder}/players.json`, JSON.stringify(players));

        }
        else {
            message.author.send('You are already in the game.');
        }
    } else if (message.content.startsWith('!admin-state')) {
        // if user ID is in admins.json
        if (message.author.id in admins) {

            // set the game state to the message content
            game.state = message.content.split(' ')[1];
            saveToJSON(`${config.dataFolder}/game.json`, game);

            // message to channel
            message.channel.send(`Game state set to: ${game.state}`);
        }
    }
});


// REMOVE ...
async function advice(message) {
    // post an image with caption
    const image = new AttachmentBuilder('sketches/logo-anarchists.jpg');
    message.channel.send({ files: [image], content: '**Prefigurative Anarcho-Syndicalists**: "Reject the AIs appointment and mobilize grassroots efforts to reclaim the museums as community spaces. Instead of relying on hierarchical structures, propose a cooperative model in which museums are governed by the public they represent."' });
}

async function propose(message) {

    // get lastDispatch from game.json
    game = loadFromJSON(`${config.dataFolder}/game.json`);

    // make sure it has been less than config.votingDurationHours since the last dispatch
    if (Date.now() - game.lastDispatch > config.votingDurationHours * 60 * 60 * 1000) {
        message.reply(`Proposals are not allowed at this time. You can only propose a new idea within ${config.votingDurationHours} hours of the last dispatch.`);
        return;
    }

    // check if the user is in the game
    if (!(message.author.id in balances)) {
        message.reply('You are not in the game. Only players can propose ideas.');
        return;
    }

    // check if the user has enough balance to propose
    if (balances[message.author.id] < config.proposalCost) {
        message.reply(`You do not have enough ${config.currency} to propose. It costs ${config.proposalCost} ${config.currency} to propose an idea.`);
        return;
    }

    // load proposals from file
    proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    // remove the prefix from the message
    let newMessage = removeCommandPrefix(message.content);

    // add to proposals.json
    const uuid = generateUUID(newMessage);
    proposals[uuid] = {
        text: newMessage,
        proposer: message.author.id,
        votes: 0
    };

    // save the proposals to the file
    saveToJSON(`${config.dataFolder}/proposals.json`, proposals);

    // deduct the cost from the user's balance
    balances[message.author.id] -= config.proposalCost;
    saveToJSON(`${config.dataFolder}/balances.json`, balances);

    // message to channel
    let username = message.author.username;
    message.channel.send(`${username} has proposed: ${newMessage}.`);

}

// function to generate text
async function generateTextTest(message) {

    // remove any prefix for this message, any word that begins with !
    let newMessage = removeCommandPrefix(message.content);

    // check if the message is not from a bot to avoid an infinite loop
    if (!message.author.bot) {
        try {

            const response = await promptOllama(newMessage, "", config.promptAppend);

            // console.log(response);

            // send the content back to the Discord channel
            message.reply(`Model Response: ${response}`);

            message.reply("Summary: " + await summarize(response));

        } catch (error) {
            console.error('Error making HTTP request:', error.message);
            message.reply('An error occurred while processing your request.');
        }
    }
}

async function generateDispatch(message) {

    // read from next-dispatch.json as JSON
    let dispatch = loadFromJSON(`${config.dataFolder}/next-dispatch.json`);

    const uuid = generateUUID(dispatch.text);

    // check if this dispatch is alreay in history
    if (uuid in history) {
        message.reply('This dispatch has already been sent.');
        return;
    }

    // add the dispatch to history
    history[uuid] = dispatch;
    saveToJSON(`${config.dataFolder}/history-of-events.json`, history);



    // remove the dispatch from next-dispatch.json
    // fs.writeFileSync(`${config.dataFolder}/next-dispatch.json`, JSON.stringify({}));


    // const response = await promptOllama(prompt, '', config.dispatchAppend);

    // test making an image attachment (get image from config.dataFolder/config.imageFolder/config.dispatchFolder)/dispatch.image

    const eventImage = new AttachmentBuilder(`${config.dispatchFolder}/${dispatch.image}`).setName("event.jpg");
    const iconURL = new AttachmentBuilder(`${config.imageFolder}/${config.gameIcon}`).setName('icon.jpg');
    const thumbnailURL = new AttachmentBuilder(`${config.imageFolder}/${config.crisisThumbnail}`).setName('thumbnail.jpg');

    console.log(iconURL.attachment);
    console.log(thumbnailURL.attachment);

    const description = "Something has happened that requires your attention. Proposals will be accepted for the next 24 hours. **This process begins now at " + new Date().toLocaleString() + ".**";

    // alternatively use b64 buffer
    // const b64image = '';
    // const data = b64image.split(',');
    // const buf = Buffer.from(data[1], 'base64');
    // const eventImage = new AttachmentBuilder(buf, 'test.jpg');

    // create a new embed
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Dispatch')
        // .setURL('https://discord.js.org/')
        .setAuthor({ name: 'The Game', iconURL: "attachment://icon.jpg", url: 'https://discord.js.org' })
        .setDescription(description)
        .setThumbnail("attachment://thumbnail.jpg")
        .addFields(
            { name: 'Crisis', value: dispatch.text },
        )
        .setImage("attachment://event.jpg") // set the image using the attachment
    // .setTimestamp("test")
    // .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

    // send the embed to the channel
    message.channel.send({ embeds: [embed], files: [eventImage, iconURL, thumbnailURL] });

    // set lastDispatch time to now
    game.lastDispatch = Date.now();
    saveToJSON(`${config.dataFolder}/game.json`, game);

    // pin message
    // message.pin();
}


client.login(process.env.DISCORD_TOKEN);

