import fs from 'fs';    // filesystem for JSON stuff
import axios from 'axios';
import dotenv from 'dotenv'
import { Client, GatewayIntentBits, Partials, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { dispatchAppend } from './helpers.mjs';

// set up bank etc
let balances;
try {
    balances = JSON.parse(fs.readFileSync('balances.json'));
} catch (err) {
    balances = {};
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

// when the client is ready
client.once('ready', () => {

    // set avatar
    // client.user.setAvatar('images/we-logo.png');

    console.log('Ready!');

    // replace 'GUILD_ID' and 'CHANNEL_ID' with your actual guild and channel IDs
    const guild = client.guilds.cache.get('568179216588341291');
    if (!guild) return console.log('Unable to find the guild.');

    const channel = guild.channels.cache.get('568179217049583627');
    if (!channel) return console.log('Unable to find the channel.');

    channel.send('Bot has started up!');

});

// general error handling
process.on('uncaughtException', (err) => {
    console.log('General error:', err.message);
    console.log(err);
});

client.on('messageCreate', async (message) => {
    // log the message content
    // console.log(message.content);

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
        message.channel.send('Each player begins with digital currency for a DAO established by the four factions in order to build a new world on the principles of self-determination, environmentalism, and egalitarianism. The currency can be pledged to advance projects which respond to material conditions within the game. If your proposal wins the voting round you earn all of the pledged currency. If you lose, you lose all of the pledged currency. The accepted proposal will alter the course of the game world and thus future situations and proposals.\n\nSome helpful commands:\n\n!balance - check your balance\n!propose - propose a project\n!vote - vote on a project\n!advice - get advice on a proposal\n!help - get help\n\nGood luck!');
    }
    else if (message.content.startsWith('!propose')) {

        // echo proposal with username
        let username = message.author.username.replace('.', '');

        // and without !propose
        let proposal = message.content.replace('!propose', '');

        message.channel.send(`Proposal from ${username} has been accepted at the cost of 10 💰: ${proposal}`);



    }
    else if (message.content.startsWith('!info')) {
        // check to see if they have a balance, if not insert them with a balance of 0
        if (!(message.author.id in balances)) {
            balances[message.author.id] = 0;
        }
        // send the user their balance
        message.author.send(`Your balance is ${balances[message.author.id]}.`);

        // save the balances to the file
        fs.writeFileSync('balances.json', JSON.stringify(balances));

        // send a message to the channel saying the user has X money
        let username = message.author.username.replace('.', '');
        message.channel.send(`Welcome to the game, ${username}. The DAO has allocated you ${balances[message.author.id]} 💰 based on your tuition.`);
    }
    else if (message.content.startsWith('!advice')) {
        generatePresentation(message);
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

