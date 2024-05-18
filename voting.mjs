import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { loadFromJSON, saveToJSON } from './helpers.mjs';
import config from './data/config.json' assert { type: 'json' };

export async function initiateVote(message) {
    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);
    const players = loadFromJSON(`${config.dataFolder}/players.json`);

    const rows = [];
    let row = new ActionRowBuilder();
    let count = 0;

    // for each proposal, create a button
    for (let proposal in proposals) {

        // get player displayName from proposer
        const proposer = players.find(p => p.discordId === proposals[proposal].proposer);

        const button = new ButtonBuilder()
            .setCustomId(proposal)
            //.setLabel(proposals[proposal].text)
            .setLabel(proposer.displayName)
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
    message.author.send('__Please vote on one of the following proposals__');

    for (let proposal in proposals) {

        const shortenedText = proposals[proposal].text.length > 1900 ? proposals[proposal].text.substring(0, 1900) + "..." : proposals[proposal].text;

        // first send the name of the proposer
        const proposer = players.find(p => p.discordId === proposals[proposal].proposer);
        let voteSummary = `**${proposer.displayName}**:\n`;
        voteSummary += shortenedText;
        voteSummary += `\nCurrent votes: ${proposals[proposal].votes}\n`;
        voteSummary += "----------------\n"

        // send as DM to user
        message.author.send(voteSummary);
    }


    // await message.author.send({ content: 'Please vote for a proposal:', components: rows });

    // send it ephemeral as a reply to user
    //message.reply({ content: voteSummary, ephemeral: true });
    await message.reply({ content: 'The active proposals have been sent to your DMs. Please vote for a proposal:', components: rows, ephemeral: true });
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

    // check entire proposals to make sure the user hasn't voted yet
    for (const proposalId in proposals) {
        if (proposals.hasOwnProperty(proposalId)) {
            const proposal = proposals[proposalId];
            //console.log("proposal: ", proposal);
            if (proposal.voters.includes(interaction.user.id)) {
                interaction.reply({ content: 'You have already voted for this proposal.', ephemeral: true });

                return;
            }
        }
    }

    proposals[interaction.customId].votes++;

    // add user to the list of voters
    proposals[interaction.customId].voters.push(interaction.user.id);

    const interactionUser = await interaction.guild.members.fetch(interaction.user.id)

    // message to channel that the user has voted
    const username = interactionUser.displayName;
    // const proposalText = proposals[interaction.customId].text;
    const proposerName = proposals[interaction.customId].proposerName;
    const voteCount = proposals[interaction.customId].votes;

    interaction.reply(`${username} has voted for ${proposerName}'s proposal. Current votes for this proposal: ${voteCount}.`);    //await interaction.reply({ content: 'You clicked Button 2!', ephemeral: true });

    // delete original message
    interaction.message.delete();   // i think...

    // write the updated proposals to the file
    saveToJSON(`${config.dataFolder}/proposals.json`, proposals);

};

export async function getResults(client, config) {

    const proposals = loadFromJSON(`${config.dataFolder}/proposals.json`);

    // sort the proposals by votes
    const sortedProposals = Object.keys(proposals).sort((a, b) => proposals[b].votes - proposals[a].votes);


    // send message to channel
    let results = "The results are in! Here are the votes for each proposal:\n";
    const channelId = config.CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);
    if (channel) {
        channel.send(results);
    } else {
        console.error(`Channel ${channelId} not found`);
    }

    for (let i = 0; i < sortedProposals.length; i++) {
        const proposal = proposals[sortedProposals[i]];

        const shortenedText = proposal.text.length > 50 ? proposal.text.substring(0, 50) + "..." : proposal.text;

        const result = `${i + 1}. **${shortenedText}**: ${proposal.votes} votes\n`;

        // create embed
        const embed = new EmbedBuilder()
            .setColor(0xFF00FF)
            // set title to the proposer's name
            .setTitle(proposal.proposerName)
            .setDescription(result);
        client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });
    }

    const numProposals = sortedProposals.length;

    const winningProposalText = await distributeCredits(client, config, proposals[sortedProposals[0]], numProposals);

    // create embed
    const embed = new EmbedBuilder()
        .setColor(0xFF00FF)
        .setTitle(`Vote Results`)
        .setDescription(winningProposalText);
    client.channels.cache.get(config.CHANNEL_ID).send({ embeds: [embed] });

    resetProposals(proposals);

    return results;

}

export async function distributeCredits(client, config, topProposal, numProposals) {

    console.log("topProposal: ", topProposal);

    let responseString = "";

    let players = loadFromJSON(`${config.dataFolder}/players.json`);

    // find player that matches winningProposer.discordId and add the credits
    const player = await players.find(p => p.discordId === topProposal.proposer);

    responseString += `The people have agreed on ${player.displayName}'s proposal, so ${config.proposalReturn}${config.currency} have been redistributed to their account.\n`;

    if (numProposals > 2) {
        const creditsDispersed = config.proposalCost * numProposals - config.proposalReturn;

        responseString += `The remaining ${creditsDispersed}${config.currency} spent on proposals has been invested in the selected proposal.\n`;

        if (player) {
            player.balance += config.proposalReturn;
        }

    }
    else if (numProposals == 1) {

        responseString += `No ${config.currency} remains, since there was only one proposal. The credits have been returned to the proposer.\n`;

        // send the credits to the user
        if (player) {
            player.balance += config.proposalCost;
        }
    }
    else if (numProposals == 0) {

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