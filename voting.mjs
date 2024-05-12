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

    // message channel the votes for each proposal at the moment
    let voteSummary = 'Current votes for each proposal:\n';
    for (let proposal in proposals) {
        voteSummary += `**${proposals[proposal].text}**: ${proposals[proposal].votes}\n`;
    }
    // send it ephemeral as a reply to user
    message.reply({ content: voteSummary, ephemeral: true });

    await message.reply({ content: 'Please vote for a proposal:', components: rows, ephemeral: true });
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

export async function getResults(client, config) {
    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    // sort the proposals by votes
    const sortedProposals = Object.keys(proposals).sort((a, b) => proposals[b].votes - proposals[a].votes);

    // create a string with the results
    let results = '__RESULTS__\n';
    for (let i = 0; i < sortedProposals.length; i++) {
        const proposal = proposals[sortedProposals[i]];
        results += `${i + 1}. **${proposal.text}**: ${proposal.votes} votes\n`;
    }

    const numProposals = sortedProposals.length;

    results += "\n" + await distributeCredits(client, config, proposals[sortedProposals[0]], numProposals);
    resetProposals(proposals);

    return results;

}

export async function distributeCredits(client, config, topProposal, numProposals) {

    let responseString = "";

    let players = loadFromJSON(`${config.dataFolder}/players.json`);

    // find player that matches winningProposer.discordId and add the credits
    const player = await players.find(p => p.discordId === topProposal.proposer);
    player.balance += 1000;


    console.log(players);

    // announce to channel
    //const channel = client.channels.cache.get(config.CHANNEL_ID);
    //channel.send(`The people have agreed on ${player.displayName}'s proposal, so ${config.proposalReturn}${config.currency} have been redistributed to their account.`);

    responseString += `The people have agreed on ${player.displayName}'s proposal, so ${config.proposalReturn}${config.currency} have been redistributed to their account.\n`;

    if (numProposals > 2) {
        const creditsDispersed = config.proposalCost * numProposals - config.proposalReturn;
        //channel.send(`The remaining ${creditsDispersed}${config.currency} spent on proposals has been invested in the selected proposal.`);
        responseString += `The remaining ${creditsDispersed}${config.currency} spent on proposals has been invested in the selected proposal.\n`;

        if (player) {
            player.balance += config.proposalReturn;
        }

    }
    else if (numProposals == 1) {
        //channel.send(`No ${config.currency} remains, since there was only one proposal. The credits have been returned to the proposer.`);
        responseString += `No ${config.currency} remains, since there was only one proposal. The credits have been returned to the proposer.\n`;

        // send the credits to the user
        if (player) {
            player.balance += config.proposalCost;
        }
    }
    else if (numProposals == 0) {
        //channel.send(`No proposals were made, so the ${config.currency} has been returned to the proposer.`);
        responseString += `No proposals were made, so the ${config.currency} has been returned to the proposer.\n`;
        // send the credits to the user
        if (player) {
            player.balance += config.proposalCost;
        }
    }

    // write the updated players to the file
    saveToJSON(`${config.dataFolder}/players.json`, players);

    return responseString;

}

export async function resetProposals(proposals) {

    // copy proposals to data/old-proposals-<timestamp>.json
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    saveToJSON(`${config.dataFolder}/old-proposals/${timestamp}.json`, proposals);

    // erase the proposals.json entirely
    proposals = {};

    saveToJSON(`${config.dataFolder}/proposals.json`, proposals);
}