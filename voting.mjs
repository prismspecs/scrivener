import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { loadFromJSON, saveToJSON } from './helpers.mjs';
import config from './data/config.json' assert { type: 'json' };

export async function initiateVote(message) {
    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    const rows = [];
    let row = new ActionRowBuilder();
    let count = 0;

    // for each proposal, create a button
    for (let proposal in proposals) {
        const button = new ButtonBuilder()
            .setCustomId(proposal)
            .setLabel(proposals[proposal].text)
            .setStyle(ButtonStyle.Primary);

        row.addComponents(button);
        count++;

        // If we've added 5 buttons to the row, add the row to the rows array and create a new row
        if (count % 5 === 0) {
            rows.push(row);
            row = new ActionRowBuilder();
        }
    }

    // Add any remaining buttons to the rows array
    if (count % 5 !== 0) {
        rows.push(row);
    }

    await message.channel.send({ content: 'Please select an option:', components: rows });
}
export async function handleInteractionCreate(interaction) {

    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    if (!interaction.isButton()) return;

    // based on interaction.customId, find the proposal and increment the votes
    // only if the user has not yet voted. nice to have: if so, ask them if they want to change their vote
    if (!proposals[interaction.customId]) {
        console.error(`No proposal found for id: ${interaction.customId}`);
        return;
    }

    if (!proposals[interaction.customId].voters) {
        proposals[interaction.customId].voters = [];
    }

    // check entire proposals to make sure the user hasn't voted yet
    for (const proposalId in proposals) {
        if (proposals.hasOwnProperty(proposalId)) {
            const proposal = proposals[proposalId];
            if (proposal.voters.includes(interaction.user.id)) {
                interaction.reply({ content: 'You have already voted for this proposal.', ephemeral: true });
                return;
            }
        }
    }


    proposals[interaction.customId].votes++;

    // add user to the list of voters
    proposals[interaction.customId].voters.push(interaction.user.id);

    // message to channel that the user has voted
    const username = interaction.user.username;
    const proposalText = proposals[interaction.customId].text;
    const voteCount = proposals[interaction.customId].votes;

    interaction.channel.send(`${username} has voted for ${proposalText}. Current votes for this proposal: ${voteCount}.`);    //await interaction.reply({ content: 'You clicked Button 2!', ephemeral: true });

    // write the updated proposals to the file
    saveToJSON(`${config.dataFolder}/proposals.json`, proposals);

};