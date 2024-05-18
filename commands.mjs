import config from './data/config.json' assert { type: 'json' };

const commands = [
    {
        name: "test",
        description: "Replies with test!"
    }
];

async function setupCommands(client) {

    const guildId = config.SERVER_ID;

    // Register the command
    await client.guilds.cache.get(guildId)?.commands.create(commands[0]);

    // Set up the interaction listener
    client.on('interactionCreate', async (interaction) => {

        console.log("interaction");

        if (!interaction.isCommand()) return;

        const { commandName } = interaction;

        if (commandName === 'test') {
            await interaction.reply('test!');
        }
    });

    console.log('Setting up commands');
}

export { setupCommands, commands };