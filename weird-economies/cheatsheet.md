## Admin Functions
!admin proposal
!admin voting
!admin endvote
!admin results
!admin storyupdate (after successful proposal)
!admin echo 
!admin embedecho
!admin announce
!admin dispatch-crisis
!admin dispatch-opportunity
!admin toggle-manual


## Commands
'!howto - Get information on how to play the game.',
'!join - Join the game manually.',
'!info - Check your credits and other information.',
'!factions - Get information on the political factions.',
'!propose [your proposal] - Propose an idea.',
'!vote [duration] [title] - Create a vote.',
'!advice - Get advice.'
'!withdrawproposal - Withdraw your recently drafted proposal from consideration.'


## Story Update

These should happen on Tuesday or Wednesday/Saturday or Sunday before the next propsal period. They are somewhat manually performed.

1) Write out the story text in convert.md, taking into account the last successful proposal
2) Use mdToJson.js to convert it to a JSON friendly format (saves to output.md)
3) Add to text of story-update.json
4) Generate an image which represents the story and add it to images/dispatches then reference this in story-update.json
5) use !admin storyupdate

## New Dispatch

This happens quickly after the Story Update.

1) Write out a text for the next dispatch and optionally use the convert to md pipeline outlined in Story Update. The file is dispatch-next.json
2) Generate an image and reference it in dispatch-next.json
3) !admin dispatch

## Summary

1) Take scrivener-prompting.md (or whatever doc you use to keep track of history) and put it into ChatGPT, ask to summarize like a newsbroadcaster would.
2) Copy/paste that into https://elevenlabs.io/app/speech-synthesis
3) Put the output into summary.txt

## Audio/Video output

1) Paste summary.txt into https://elevenlabs.io/app/speech-synthesis
2) Download that file into audio/...
3) run ```node video.mjs`` after changing the parameters at the bottom

## Examples

Story update:

**The Forever Marxists proposed a successful project, initiated by <@###>. In short, the plan is:**

Take the offensive by creating controlled leaks to identify the infiltrator. Develop unique pieces of false information for different groups or individuals within the DAO to flush out informants. Additionally, spy on enemies by hacking the EU naval surveillance and placing operatives inside governments and corporations to gather intelligence. This difficult but necessary sacrifice ensures staying informed about enemies' actions.

```Weeks go by as we put the plan into action...```
## DAO Infiltration into the EU Government and MetaZonPrime
Several members undertake high-risk undercover missions within the EU government and MetaZonPrime corporate headquarters. These operations are critical to gather intelligence, influence policy, and disrupt adversarial activities from within. We haven't located the mole, if they do in fact exist, but will continue to monitor and enact strict security protocols.

```While that takes place, there are other developments on the front```
## Terrorist Organization?
Our base on Sazan has attracted too much attention and as a result some illiberal governments have labeled us as a terrorist organization. We need to decide how to handle this from a PR perspective.

## Banca di Bologna
Banca di Bologna, now under the control of the DAO and led by Dr. Toto Bifo Lombardi, has become a pivotal financial asset for the organization. The bank has been discreetly funneling capital into DAO initiatives, ensuring a steady stream of resources for ongoing and future projects. The bank remains established in such a way as to not invite the label of "terrorist" from outside governments.

## Refugee Crisis
The crisis continues, but our operation on Sazan has been crucial in assisting our comrades coming in to escape the climate crisis in northern Africa. It feels certain that in future this base will become totally overwhelmed.




dispatch-next.json:
## Dispatch: Major Political Shifts and Economic Crisis

Ireland has announced reunification, and Scotland has declared separation from the UK. These monumental changes have significantly impacted the UK’s economy, especially with Scotland now controlling most of the North Sea’s petroleum resources. This upheaval adds a complex dimension to our narrative:

1. **Economic Impacts:** The loss of key territories is crippling the remaining UK economy. The reduced access to North Sea petroleum is particularly damaging, leading to severe energy shortages and economic instability.

2. **Policy Shifts:** The new national entities, the Republic of Ireland and the Republic of Scotland, will need to formulate policies addressing the ongoing ecological and refugee crises. Their approaches could set new precedents in international relations and crisis management.

3. **Strategic Positions:** Both Ireland and Scotland must navigate their positions strategically. How will they align themselves on the global stage? Will they support or oppose the illiberal regimes dominating the world?

4. **Potential Conflict:** The drastic changes raise the possibility of conflict. Could the UK or other nations resort to military action to reclaim lost territories or secure resources?

5. **DAO Opportunities and Consequences:** These developments present both opportunities and risks for the DAO alliance. The fragmentation could weaken our adversaries but also destabilize the region, complicating our operations. How will we adapt to these new geopolitical realities?

As we proceed, careful consideration of these factors is crucial for our strategy and the future of our mission.




## Formatting for Discord cheatsheet
```──────────────────── Some Text ────────────────────```
**bold**
__underline__
*italic*
> blockquote
* list item
- list item
1. list item
[text](link)
@username
~~strikethrough~~
# Headers

can also hackishly use colors with syntax highlighting like
```fix
colored blue
```

