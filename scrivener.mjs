import dotenv from 'dotenv'
import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder, ButtonStyle } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder } from 'discord.js';   // voting
import { initiateVote, handleInteractionCreate, getResults, distributeCredits } from './voting.mjs';
import { generateUUID, showFactions, promptOllama, removeCommandPrefix, summarize, loadFromJSON, saveToJSON, splitTextIntoChunks, unpinAllMessages, quickEmbed, capitalize, announce, loadTextFile } from './helpers.mjs';
import { RateLimiter } from 'discord.js-rate-limiter';
import { setupSchedule } from './scheduler.mjs';
import DiscordFormatter from './discordFormatter.mjs';
import fs from 'fs';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

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

// slash commands (not working)
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!',
    },
    {
        name: 'beep',
        description: 'Replies with Boop!',
    }
];
const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        const data = await rest.put(
            Routes.applicationCommands(config.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();

// oldschool commands
const commandList = [
    '!howto - Get information on how to play the game.',
    '!join - Join the game manually.',
    '!summary - Get a summary of the game so far.',
    '!factions - Get information on the political factions.',
    '!dispatch - Show the current dispatch.',
    '!propose [your proposal] - Propose an idea.',
    '!vote - Cast a vote.',
    '!advice - Get advice from your faction.',
    '!advice [faction] - Get advice from a specific faction. Factions include marxists, progressives, anarchists, monads, and eschatologists.',
    'visit https://prismspecs.github.io/scrivener/howtoplay.html for more information.'
];

let manualMode;

// when the client is ready
client.once('ready', () => {

    // set avatar
    // client.user.setAvatar('images/we-logo.png');

    manualMode = loadFromJSON(`${config.dataFolder}/game.json`).manualMode;

    console.log(`Ready! Game currently in ${game.state} phase. Manual mode is ${manualMode}.`);

    // connect to guild and channel
    const guild = client.guilds.cache.get(config.SERVER_ID);
    if (!guild) return console.log('Unable to find the guild.');

    const channel = guild.channels.cache.get(config.CHANNEL_ID);
    if (!channel) return console.log('Unable to find the channel.');

    // send a message to the channel when the bot comes online
    //channel.send('Scrivener is now online.');

    // task scheduling
    setupSchedule(changeState);

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

            // Extract command from message content
            const command = message.content.split(' ')[0];

            // Switch statement to handle different commands
            switch (command) {
                case '!generate':
                    // generateTextTest(message);
                    break;
                case '!howto':
                    const welcomeMessage = "Welcome to Scrivener. In this game, you are co-writing a speculative future with the help of an AI storyteller. As members of the DAO in the near-future, you'll make proposals and decisions that shape a nondeterministic narrative, resisting the forces of illberalism. Write your proposals and see how the story unfolds!\n\nSome helpful commands:\n\n";
                    const commandListString = commandList.join('\n');
                    message.reply({ content: `${welcomeMessage}${commandListString}\n\nGood luck!`, ephemeral: true });
                    break;
                case '!factions':
                    showFactions(message, config);
                    break;
                case '!propose':
                    if (game.state !== 'proposal') {
                        message.reply('Proposals are not allowed at this time. Please wait for the next dispatch.');
                        break;
                    }
                    propose(message);
                    break;
                case '!proposals':
                    listProposals();
                    break;
                case '!vote':
                    if (game.state !== 'voting') {
                        message.reply('Voting is not allowed at this time. Please wait until the proposal period is over.');
                        break;
                    }
                    initiateVote(message);
                    client.on('interactionCreate', handleInteractionCreate);
                    break;
                case '!summary':
                    summary(message);
                    break;
                case '!dispatch':
                    const history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);
                    const dispatch = Object.values(history).pop();
                    console.log(dispatch);
                    displayDispatch(dispatch);
                    break;
                case '!advice':
                    let factionName = message.content.split(' ')[1];
                    if (factionName) {
                        factionName = factionName.replace(/[^a-zA-Z]/g, '');
                    }
                    if (factionName) {
                        switch (factionName) {
                            case "marxists":
                                factionName = "Forever Marxists";
                                break;
                            case "progressives":
                                factionName = "Progressive Deep State";
                                break;
                            case "anarchists":
                                factionName = "Anarcho-Syndicalists";
                                break;
                            case "monads":
                                factionName = "Beyond-Us Monadists";
                                break;
                            case "eschatologists":
                                factionName = "Postcapitalist Eschatologists";
                                break;
                        }
                        advice(message, factionName);
                    } else {
                        advice(message);
                    }
                    break;
                case '!join':
                    joinGame(message);
                    break;
                case '!admin':
                    if (isPlayerAdmin(message.author.id)) {
                        adminCommand(message);
                    }
                    break;
                default:
                    message.reply('This is not a recognized command. Please type !howto for a list of commands.');
                    break;
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

async function summary(message) {
    // load from data/summary.txt text file
    const summaryText = await loadTextFile(`${config.dataFolder}/summary.txt`);

    // break the message into multiple parts because the maximum length of a message is 2000 characters
    const parts = splitTextIntoChunks(summaryText, 2000);

    // send each part as a separate DM to the user
    for (const part of parts) {
        message.author.send(part);
    }

    // get the most recent file from video/ directory and send it to the user
    const files = fs.readdirSync('video/');
    const video = new AttachmentBuilder(`video/${files[files.length - 1]}`).setName("video.mp4");
    message.author.send({ files: [video] });

    // send video to channel
    client.channels.cache.get(config.CHANNEL_ID).send({ files: [video] });
    client.channels.cache.get(config.CHANNEL_ID).send(`*Full summary text has sent to your DMs, ${message.member.displayName}. Anyone can also view the video summary below.*`);
}

async function listProposals() {

    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    const embed = quickEmbed('Proposals', 'The proposals which have been drafted are as follows:', 0xFFFFFF);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    for (let proposal in proposals) {

        // make sure proposal text is fewer than 2000 characters
        if (proposals[proposal].text.length > 1900) {
            proposals[proposal].text = proposals[proposal].text.substring(0, 1900) + '...';
        }

        const df = new DiscordFormatter()
            .addHeader(proposals[proposal].proposerName + "'s proposal")
            .addText(proposals[proposal].text)
            .addLineBreak()
            .addText("*current votes: " + proposals[proposal].votes + "*");

        client.channels.cache.get(config.CHANNEL_ID).send(df.string());
    }
}

async function advice(message, factionName) {

    let advice;
    let faction;

    if (!factionName) {

        // load players from json
        players = loadFromJSON(`${config.dataFolder}/players.json`);

        // get the faction associated with the player from players.json
        const player = players.find(p => p.discordId === message.author.id);

        // find the faction which matches the player's faction
        faction = factions.find(f => f.name === player.faction);

        // get the advice from the faction object
        advice = faction.advice;
    } else {
        // get the faction associated with factionName
        faction = factions.find(f => f.name === factionName);
        advice = faction.advice;
    }

    // get the latest dispatch from history-of-events.json
    const history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);
    const latestDispatch = Object.values(history).pop().text;

    //console.log(latestDispatch);

    // check if the message is not from a bot to avoid an infinite loop
    if (!message.author.bot) {
        try {

            let response = await promptOllama(latestDispatch, "Limit your response to 1500 characters or fewer: ", "respond as if you were a leader of the " + faction.name + " faction, which believes in " + advice + " but give advice specific to this situation. Be certain to limit your response to 1500 characters or fewer!");

            // console.log(response);

            // if the response is longer than 1800 characters, cut it off
            if (response.length > 1800) {
                response = response.substring(0, 1800) + '...';
            }

            // create a new string copy of response but for each new line, put a "> " in front of it
            response = response.split('\n').map(line => '> ' + line).join('\n');

            // send the content back to the Discord channel
            message.reply(`${faction.name}:\n\n${response}`);

            //message.reply("Summary: " + await summarize(response));

        } catch (error) {
            console.error('Error making HTTP request:', error.message);
            message.reply('An error occurred while processing your request.');
        }
    }

}

async function propose(message) {

    // if the message is blank after !propose
    if (message.content.split(' ').length === 1) {
        message.reply({
            content: 'Please include your proposal after !propose.',
            ephemeral: true
        });
        return;
    }

    // if the message is over 2000 characters
    if (message.content.length > 2000) {
        message.reply({
            content: 'Proposals must be 2000 characters or fewer. Please reduce the length of your proposal and try again.',
            ephemeral: true
        });
        return;
    }

    // get lastDispatch time from game.json
    game = loadFromJSON(`${config.dataFolder}/game.json`);

    // load players
    players = loadFromJSON(`${config.dataFolder}/players.json`);

    // make sure it has been less than config.votingDurationHours since the last dispatch
    if (Date.now() - game.lastDispatch > config.votingDurationHours * 60 * 60 * 1000) {
        message.reply({
            content: `Proposals are not allowed at this time. You can only propose a new idea within ${config.votingDurationHours} hours of the last dispatch.`,
            ephemeral: true
        });
        return;
    }

    // check if the player is in the game
    if (!players.find(player => player.discordId === message.author.id)) {
        message.reply({
            content: 'You are not in the game. Only players can propose ideas. Join with **!join**.',
            ephemeral: true
        });
        return;
    }

    // check if the user has enough balance to propose
    // if (players.find(player => player.discordId === message.author.id).balance < config.proposalCost) {
    //     message.reply({
    //         content: `You do not have enough ${config.currency} to propose. It costs ${config.proposalCost} ${config.currency} to propose an idea.`,
    //         ephemeral: true
    //     });
    //     return;
    // }

    // load proposals from file
    proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    // remove the prefix from the message
    let proposal = removeCommandPrefix(message.content);

    // add to proposals.json
    const uuid = generateUUID(proposal);
    proposals[uuid] = {
        text: proposal,
        proposer: message.author.id,
        proposerName: message.member.displayName,
        votes: 0,
        voters: []
    };

    // save the proposals to the file
    saveToJSON(`${config.dataFolder}/proposals.json`, proposals);

    // deduct the cost from the user's balance
    // players.find(player => player.discordId === message.author.id).balance -= config.proposalCost;

    let username = message.member.displayName;

    // delete the original message from chat
    message.delete();

    const embed = quickEmbed('New Proposal', username, 0xFF553d);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    const df = new DiscordFormatter()
        .addText(proposal);

    client.channels.cache.get(config.CHANNEL_ID).send(df.string());
}

async function storyUpdate(message) {
    // load story-update.json
    const storyUpdate = loadFromJSON(`${config.dataFolder}/story-update.json`);

    // break the message into multiple parts because the maximum length of a message is 2000 characters
    const parts = splitTextIntoChunks(storyUpdate.text, 2000);

    const embed = quickEmbed('Story Update', 'the future is being written', 0x5555ff);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    // send each part as a separate message to the main channel
    for (const part of parts) {
        client.channels.cache.get(config.CHANNEL_ID).send(part);
    }

    // send the image
    const image = new AttachmentBuilder(`${config.dispatchFolder}/${storyUpdate.image}`).setName("story-update.jpg");
    client.channels.cache.get(config.CHANNEL_ID).send({ files: [image] });

    // generate a uuid for the story update and add it to history-of-events.json
    const first100Characters = storyUpdate.text.substring(0, 100);

    const uuid = generateUUID(first100Characters);
    history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);

    // check if this dispatch is already in history
    if (uuid in history) {
        console.log("duplicate story update");
        return;
    }

    // get current timestamp
    const now = new Date().toLocaleString();

    // add the dispatch to history, should have text and image properties
    // add the story update to history
    history[uuid] = {
        "text": storyUpdate.text,
        "image": storyUpdate.image,
        "timestamp": now
    };

    saveToJSON(`${config.dataFolder}/history-of-events.json`, history);

    // set game mode to chilling
    game.state = 'chilling';

}

async function generateDispatch() {

    // read from dispatch-next.json as JSON
    let dispatch = loadFromJSON(`${config.dataFolder}/dispatch-next.json`);
    // save dispatch to dispatch-current.json
    saveToJSON(`${config.dataFolder}/dispatch-current.json`, dispatch);

    //console.log(dispatch);

    const uuid = generateUUID(dispatch.text);

    history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);

    // check if this dispatch is alreay in history
    if (uuid in history) {
        console.log('This dispatch has already been sent.');
        return;
    }

    // add timestamp to dispatch
    dispatch.timestamp = Date.now();

    // add the dispatch to history
    history[uuid] = dispatch;
    saveToJSON(`${config.dataFolder}/history-of-events.json`, history);

    // set lastDispatch time to now
    game.lastDispatch = Date.now();
    saveToJSON(`${config.dataFolder}/game.json`, game);

    displayDispatch(dispatch);

}

function displayDispatch(dispatch) {

    // color is green for opportunity, red for crisis
    const color = dispatch.type === 'opportunity' ? 0x55ff55 : 0xff5555;

    const embed = quickEmbed('DISPATCH', dispatch.type, color);
    // message.channel.send({ embeds: [embed] });
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    const dispatchImage = new AttachmentBuilder(`${config.dispatchFolder}/${dispatch.image}`).setName("event.jpg");

    // send image to channel
    // message.channel.send({ files: [dispatchImage] });
    client.channels.cache.get(config.CHANNEL_ID).send({ files: [dispatchImage] });

    client.channels.cache.get(config.CHANNEL_ID).send(config.dispatchHeader);
    client.channels.cache.get(config.CHANNEL_ID).send(dispatch.text);
    client.channels.cache.get(config.CHANNEL_ID).send(config.dispatchInstructions);

    // unpin previous messages
    // unpinAllMessages(client, config.CHANNEL_ID);

    // Create an array to store all promises
    // const promises = [];

    // // Send the messages and push the promises to the array
    // promises.push(client.channels.cache.get(config.CHANNEL_ID).send(config.dispatchHeader));
    // promises.push(client.channels.cache.get(config.CHANNEL_ID).send(dispatch.text));
    // promises.push(client.channels.cache.get(config.CHANNEL_ID).send(config.dispatchInstructions));

    // // Wait for all promises to resolve
    // Promise.all(promises)
    //     .then(messages => {
    //         // Pin all messages
    //         messages.forEach(sentMessage => sentMessage.pin());
    //     })
    //     .catch(error => {
    //         console.error('Error pinning messages:', error);
    //     });
}

function isPlayerAdmin(discordId) {
    const player = players.find(p => p.discordId === discordId);
    return player && player.admin;
}

function adminCommand(message) {

    console.log('Admin command received: ', message.content.split(' ')[1]);

    const command = message.content.split(' ')[1];

    switch (command) {
        case 'dispatch':
            changeState('proposal');
            break;
        case 'proposal':
            changeState('proposal');
            break;
        case 'voting':
            changeState('voting');
            break;
        case 'endvote':
            changeState('results');
            break;
        case 'storyupdate':
            storyUpdate(message);
            break;
        case 'sendImage':
            sendImage(message, image);
            break;
        case 'generateDispatch':
            generateDispatch();
            break;
        case 'displayDispatch':
            let dispatch = loadFromJSON(`${config.dataFolder}/dispatch-next.json`);
            displayDispatch(dispatch);
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
        case 'announce':
            const text = message.content.split(' ').slice(2).join(' ');
            announce(client, config.CHANNEL_ID, text);
            break;
        case 'toggle-manual':
            manualMode = !manualMode;
            // save manual mode to game.json
            game.manualMode = manualMode;
            saveToJSON(`${config.dataFolder}/game.json`, game);
            message.reply(`Manual mode set to: ${manualMode}`);
            break;
        case 'reminder-proposal':
            remindPropose();
            break;
        default:
            message.reply('Invalid admin command.');
    }
}

function remindPropose() {

    const history = loadFromJSON(`${config.dataFolder}/history-of-events.json`);
    const dispatch = Object.values(history).pop();
    displayDispatch(dispatch);

    // remind players to propose
    const embed = quickEmbed('Reminder', 'Submit your proposals now.', 0x5555ff);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    // send a message to the channel
    client.channels.cache.get(config.CHANNEL_ID).send('## Comrades, make your proposals for the next 6 hours\n\n@everyone Proposing a plan of action in *Scrivener* involves reading the latest Dispatch and crafting a speculative plan of action. After the proposal round has finished, everyone can determine the course of action through voting. To propose a plan of action simply type !propose [your proposal here].\n\n__Example__\n*!propose My fellow Marxists, we must always focus our efforts on seizing the means of production. To do this, I propose a three point plan of ...*');

}

// function to send an image
function sendImage(message, image) {
    const imageAttachment = new AttachmentBuilder(image).setName('image.jpg');
    message.channel.send({ files: [imageAttachment] });
}

async function changeState(newState) {

    game.state = newState;
    saveToJSON(`${config.dataFolder}/game.json`, game);

    let description = "";

    if (newState === 'proposal') {
        generateDispatch();
        description = "submit your proposals now";
    }
    if (newState === 'voting') {
        description = "voting begins now";
    }
    if (newState === 'results') {
        description = "voting has ended";
    }

    // announce to channel as an embed with image
    const image = new AttachmentBuilder(`${config.imageFolder}/${newState}.jpg`).setName("state.jpg");

    // message.channel.send({ embeds: [quickEmbed(capitalize(newState), description, 0x5555ff, image)] });
    const embed = quickEmbed(capitalize(newState), description, 0x5555ff, image.name);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    description = config.stateTexts[newState];
    client.channels.cache.get(config.CHANNEL_ID).send(description);

    if (newState === 'results') {

        const results = await getResults(client, config);
        //description += "\n\n" + results;

        description += "\n\nThe proposed action will be underway immediately... time will tell if it was the right choice. We should know within a day.";

    }
}

client.login(process.env.DISCORD_TOKEN);