import fs from 'fs';    // filesystem for JSON stuff
import axios from 'axios';
import dotenv from 'dotenv'
import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { dispatchAppend, commandList, SERVER_ID, CHANNEL_ID } from './helpers.mjs';
import { commands, setupCommands } from './commands.mjs';
import { RateLimiter } from 'discord.js-rate-limiter';

// allows 1 command every x seconds
const rateLimiter = new RateLimiter(1, 2000);

// set up bank etc
const dataFolder = 'data';
let balances;
try {
    balances = JSON.parse(fs.readFileSync(`${dataFolder}/balances.json`));
} catch (err) {
    balances = {};
}
// list of which Discord IDs are valid players
let players;
try {
    players = JSON.parse(fs.readFileSync(`${dataFolder}/players.json`));
}
catch (err) {
    players = {};
}

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


// when the client is ready
client.once('ready', () => {

    // set avatar
    // client.user.setAvatar('images/we-logo.png');

    console.log('Ready!');

    // replace 'SERVER/GUILD_ID' and 'CHANNEL_ID' with your actual guild and channel IDs
    const guild = client.guilds.cache.get(SERVER_ID);
    if (!guild) return console.log('Unable to find the guild.');

    const channel = guild.channels.cache.get(CHANNEL_ID);
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
        message.channel.send('Pong.');
    }
    else if (message.content.startsWith('!embed')) {
        generateTestEmbed(message);
    }
    else if (message.content.startsWith('!howto')) {
        const welcomeMessage = "Each player begins with digital currency for a DAO established by the four factions in order to build a new world on the principles of self-determination, environmentalism, and egalitarianism. The currency can be pledged to advance projects which respond to material conditions within the game. If your proposal wins the voting round you earn all of the pledged currency. If you lose, you lose all of the pledged currency. The accepted proposal will alter the course of the game world and thus future situations and proposals.\n\nSome helpful commands:\n\n";
        const commandListString = commandList.join('\n');
        message.channel.send(`${welcomeMessage}${commandListString}\n\nGood luck!`);

    }
    else if (message.content.startsWith('!propose')) {

        // echo proposal with username
        let username = message.author.username;

        // and without !propose
        let proposal = message.content.replace('!propose', '');

        message.channel.send(`Proposal from ${username} has been accepted at the cost of 10 💰: ${proposal}`);

    }
    else if (message.content.startsWith('!balance')) {
        // check the balance of the user in the balances.json file and send to server
        let username = message.author.username;
        let balance = balances[message.author.id];
        message.channel.send(`${username}, your balance is ${balance} 💰`);
    }
    else if (message.content.startsWith('!advice')) {
        generatePresentation(message);
    }
    else if (message.content.startsWith('!add')) {
        // add user to the game and include them in players.json, and give them 100 credits, but only if they're not already in the game
        if (!(message.author.id in balances)) {
            balances[message.author.id] = 100;

            // message to channel welcoming player
            let username = message.author.username;
            message.channel.send(`Welcome to the game, ${username}. The DAO has allocated you 100 💰 based on your tuition.`);

            // save the balances to the file
            fs.writeFileSync(`${dataFolder}/balances.json`, JSON.stringify(balances));

            // save player to players.json
            players[message.author.id] = message.author.username;
            fs.writeFileSync(`${dataFolder}/players.json`, JSON.stringify(players));


        }
        else {
            message.author.send('You are already in the game.');
        }


    }
});

async function generatePresentation(message) {
    // post an image with caption
    const image = new AttachmentBuilder('sketches/logo-anarchists.jpg');
    message.channel.send({ files: [image], content: '**Prefigurative Anarcho-Syndicalists**: "Reject the AIs appointment and mobilize grassroots efforts to reclaim the museums as community spaces. Instead of relying on hierarchical structures, propose a cooperative model in which museums are governed by the public they represent."' });

}

// function to generate text
async function generateTextTest(message) {

    // remove any prefix for this message, any word that begins with !
    let newMessage = message.content.replace(/![a-zA-Z]+\s/g, '');

    // log the new message
    console.log(newMessage);


    // create a variable and prepend a prefix to the message
    newMessage = `Make sure to respond with fewer than 2000 characters to this: ${message.content}`;

    // check if the message is not from a bot to avoid an infinite loop
    if (!message.author.bot) {
        try {
            // make the HTTP request to the specified endpoint
            const response = await axios.post('http://localhost:11434/api/chat', {
                model: 'mistral',
                stream: false,
                messages: [{ role: 'user', content: newMessage }]
            });

            // extract only the 'content' property from the response
            const content = response.data.message.content;

            // send the 'content' back to the Discord channel
            message.reply(`Model Response: ${content}`);

        } catch (error) {
            console.error('Error making HTTP request:', error.message);
            message.reply('An error occurred while processing your request.');
        }
    }
}

async function generateTestEmbed(message) {

    // prompt ollama
    const prompt = "Create a crisis that requires the player's attention. The crisis must be political in nature and take place in the near future.";

    const response = await promptOllama(prompt, '', dispatchAppend);

    // test making an image attachment
    const eventImage = new AttachmentBuilder('images/test.jpg');

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
        .setAuthor({ name: 'The Game', iconURL: 'https://pbs.twimg.com/media/E3rSY-LWYAshAuI.jpg', url: 'https://discord.js.org' })
        .setDescription('Something has happened that requires your attention.')
        .setThumbnail('https://i.kym-cdn.com/entries/icons/facebook/000/011/743/metal-gear-alert.jpg')
        .addFields(
            { name: 'Crisis', value: response },
        )
        .setImage('attachment://test.jpg') // Set the image using the attachment
        .setTimestamp()
    // .setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });


    // send the embed to the channel
    message.channel.send({ embeds: [embed], files: [eventImage] });
}



async function promptOllama(prompt, prepend, append) {
    // make the HTTP request to the specified endpoint
    const response = await axios.post('http://localhost:11434/api/chat', {
        model: 'mistral',
        stream: false,
        messages: [{ role: 'user', content: `${prepend} ${prompt} ${append}` }]
    });

    // extract only the 'content' property from the response
    return response.data.message.content;
}

client.login(process.env.DISCORD_TOKEN);

