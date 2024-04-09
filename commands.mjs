import config from './data/config.json' assert { type: 'json' };

const commands = [
    {
        name: "ping",
        description: "Replies with Pong!"
    }
];

async function setupCommands(client) {

    const guildId = config.SERVER_ID;

    // Define the data for the ping command
    const pingCommandData = {
        name: 'ping',
        description: 'Replies with Pong!'
    };

    // Register the command
    await client.guilds.cache.get(guildId)?.commands.create(pingCommandData);

    // Set up the interaction listener
    client.on('interactionCreate', async (interaction) => {

        console.log("interaction");

        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'ping') {
            await interaction.reply('Pong!');
        }
    });

    console.log('Setting up commands');
}

export { commands, setupCommands };