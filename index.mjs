import fs from 'fs';    // filesystem for JSON stuff
import axios from 'axios';
import dotenv from 'dotenv'
import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder, ButtonStyle } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder } from 'discord.js';   // voting
import { Poll, PollLayoutType } from 'discord.js';  // voting (official poll)
import { commands, setupCommands } from './commands.mjs';
import { initiateVote, handleInteractionCreate } from './voting.mjs';
import { generateUUID, showFactions, promptOllama, removeCommandPrefix, summarize, loadFromJSON, saveToJSON } from './helpers.mjs';
import { RateLimiter } from 'discord.js-rate-limiter';
import cron from 'node-cron';

// allows 1 command every x seconds
const rateLimiter = new RateLimiter(1, 2000);

// all the game data files
const config = loadFromJSON(`data/config.json`);
let game = loadFromJSON(`${config.dataFolder}/game.json`);
let proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);
let players = loadFromJSON(`${config.dataFolder}/players.json`);
let history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);
const factions = loadFromJSON(`${config.dataFolder}/factions.json`);

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
    'partials': [Partials.Channel, Partials.Message]
});

dotenv.config()

// commands (not working atm)
// from https://cratecode.com/info/discordjs-slash-commands
setupCommands(client);

const commandList = [
    '!howto - Get information on how to play the game.',
    '!join - Join the game manually.',
    '!info - Check your credits and other information.',
    '!factions - Get information on the political factions.',
    '!propose [your proposal] - Propose an idea.',
    '!vote [duration] [title] - Create a vote.',
    '!advice - Get advice.'
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

    channel.send('Scrivener is now online.');

    // schedule a task to run at Xpm every day
    // format is minutes hours day month dayOfWeek
    cron.schedule('37 20 * * *', () => {
        client.channels.cache.get(config.CHANNEL_ID).send('cron test!');
    });

});

// general error handling
process.on('uncaughtException', (err) => {
    console.log('General error:', err.message);
    console.log(err);
});

// handle messages/commands
client.on('messageCreate', async (message) => {

    // DM commands to bot
    if (!message.guild) {
        // if the DM is not from the bot itself
        if (message.author.id !== client.user.id) {
            console.log("DM received: ", message.content);
        }
        if (isPlayerAdmin(message.author.id)) {
            // if it starts with !admin
            if (message.content.startsWith('!admin')) {
                adminCommand(message);
            }
        }
    } else {

        // if message begins with "!"
        if (message.content.startsWith('!')) {

            // check rate limit and return if the user is sending messages too quickly
            if (rateLimiter.take(message.author.id)) {
                message.reply('You are sending messages too quickly.');
                return;
            }

            // log the message content noting the user, plus a new line character
            console.log(`Message from ${message.member.displayName}: ${message.content}\n`);
        }

        // check message !command prefix
        if (message.content.startsWith('!generate')) {
            // generateTextTest(message);
        }

        else if (message.content.startsWith('!howto')) {
            const welcomeMessage = "Each player begins with digital currency for a DAO established by the four factions in order to build a new world on the principles of self-determination, environmentalism, and egalitarianism. The currency can be pledged to advance projects which respond to material conditions within the game. If your proposal wins the voting round you earn all of the pledged currency. If you lose, you lose all of the pledged currency. The accepted proposal will alter the course of the game world and thus future situations and proposals.\n\nSome helpful commands:\n\n";
            const commandListString = commandList.join('\n');
            //message.channel.send(`${welcomeMessage}${commandListString}\n\nGood luck!`);
            message.reply({ content: `${welcomeMessage}${commandListString}\n\nGood luck!`, ephemeral: true });
        }

        else if (message.content.startsWith('!factions')) {
            showFactions(message, config);
        }

        else if (message.content.startsWith('!dispatch')) {
            // create a dispatch
            generateDispatch(message);

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
        else if (message.content.startsWith('!info')) {
            let username = message.member.displayName;
            // get balance from players array
            let myBalance = players.find(player => player.discordId === message.author.id).balance;
            let myFaction = players.find(player => player.discordId === message.author.id).faction;
            // reply with balance and faction
            message.reply(`${username}, you have ${myBalance} ${config.currency}. You are a member of the ${myFaction} faction.`);
        }
        else if (message.content.startsWith('!advice')) {
            advice(message);
        }
        else if (message.content.startsWith('!join')) {
            joinGame(message);
            // add user to the game and include them in players.json, and give them 100 credits, but only if they're not already in the game
            // if (!(message.author.id in balances)) {
            //     balances[message.author.id] = 100;

            //     // message to channel welcoming player
            //     let username = message.member.displayName;
            //     message.channel.send(`Welcome to the game, ${username}. The DAO has allocated you 100 ${config.currency} based on your tuition.`);

            //     // save the balances to the file
            //     fs.writeFileSync(`${config.dataFolder}/balances.json`, JSON.stringify(balances));

            //     // save player to players.json
            //     players[message.author.id] = message.member.displayName;
            //     fs.writeFileSync(`${config.dataFolder}/players.json`, JSON.stringify(players));

            // }
            // else {
            //     message.author.send('You are already in the game.');
            // }
        } else if (message.content.startsWith('!admin')) {
            if (isPlayerAdmin(message.author.id)) {
                adminCommand(message);
            }
        }
    }
});


// function to join the game
function joinGame(message) {

    players = loadFromJSON(`${config.dataFolder}/players.json`);

    // check to see if player is already in the game
    if (players.find(player => player.discordId === message.author.id)) {
        message.reply('You are already in the game.');
        return;
    }

    const member = message.member;

    const joinMessage = `Welcome to ${config.gameName}, ${member.displayName}!\n\n` +
        `You can read more about how to play in the #scrivener-rulebook channel. You have been selected as a member of the ${config.groupName}, the last bastion of the Left in the year ${config.gameYear}. You must work together through debate and cooperation to spend our pooled resources in order to respond to crises and opportunities. At any time you may type !help to get some basic instructions and a list of available actions you may take. You have been given ${config.startingBalance} ${config.currency} as a valued comrade in our quest author a new future beyond the shadow of illiberalism.\n\n` +
        `Please select a faction to join below. You can read more about them at <#${config.RULEBOOK_ID}> or by typing !factions\n\nChoose your faction:`;

    // create button for each faction
    const buttons = factions.map((faction) => {
        return new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel(faction.name)
            .setCustomId(faction.name);
    });

    const row = new ActionRowBuilder().addComponents(...buttons);

    message.reply({ content: joinMessage, components: [row], ephemeral: true });

    // listen for interaction events
    const filter = (interaction) => interaction.isButton() && interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 }); // Adjust time as needed

    collector.on('collect', async (interaction) => {
        const factionName = interaction.customId;
        const player = {
            displayName: member.displayName,
            discordId: member.id,
            balance: config.startingBalance,
            faction: factionName
        };
        // Add player to players array
        players.push(player);
        // Save players array to players.json using saveToJSON
        saveToJSON(`${config.dataFolder}/players.json`, players);

        await interaction.reply(`${member.displayName} has joined the ${factionName} faction!`);

        const guild = client.guilds.cache.get(config.SERVER_ID);

        const role = guild.roles.cache.find(role => role.name === factionName);
        await member.roles.add(role);
    });

    collector.on('end', collected => {
        // Check if no interactions were collected
        if (collected.size === 0) {
            message.channel.send('Time ran out and no faction was selected. Please use !join to try again.');
        } else {
            // Edit the interaction to remove the components
            collected.first().reply({ content: 'Faction selection ended.', ephemeral: true });
        }
    });

}


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
    let username = message.member.displayName;
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

function isPlayerAdmin(discordId) {
    const player = players.find(p => p.discordId === discordId);
    return player && player.admin;
}

function adminCommand(message) {

    console.log('Admin command received: ', message.content.split(' ')[1]);

    const command = message.content.split(' ')[1];

    switch (command) {
        case 'proposal':
            changeState('proposal');
            break;
        case 'voting':
            changeState('voting');
            break;
        case 'endvote':
            changeState('results');
            break;
        case 'echo':
            // send message to the main channel of everything after !admin echo
            const echoMessage = message.content.split(' ').slice(2).join(' ');
            client.channels.cache.get(config.CHANNEL_ID).send(echoMessage);
            break;
        case 'embedecho':
            // send message to the main channel of everything after !admin echo
            const embedMessage = message.content.split(' ').slice(2).join(' ');
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`${config.gameName} Broadcast`)
                .setDescription(embedMessage);
            client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });
            break;
        default:
            message.reply('Invalid admin command.');
    }

    // set the game state to the message content
    // game.state = message.content.split(' ')[1];

    // message to channel
    // message.channel.send(`Game state set to: ${game.state}`);
    // DM the user

}

function changeState(newState) {
    game.state = newState;
    saveToJSON(`${config.dataFolder}/game.json`, game);

    // announce to channel as an embed with image
    const image = new AttachmentBuilder(`${config.imageFolder}/${newState}.jpg`).setName("state.jpg");

    const description = config.stateTexts[newState];

    const embed = new EmbedBuilder()
        .setTitle(newState.toUpperCase())
        .setDescription(description)
        .setImage("attachment://state.jpg")
        .setColor(0xFF00FF);

    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed], files: [image] });
}


client.login(process.env.DISCORD_TOKEN);

