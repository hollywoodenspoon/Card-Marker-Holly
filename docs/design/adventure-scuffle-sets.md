> Copied from the claude.ai doc https://claude.ai/artifact/5RABFS9wYg643nJhekYD62 on 2026-11-01 (the original is in `originals/adventure-scuffle-sets.pdf`). The doc may be newer than this copy.

# Adventure Scuffle: new sets design

2026-10-23 · <span atom="mention" principal="u_NgiPJSc9rChaaEJD9JQ6yQ">@u_NgiPJSc9rChaaEJD9JQ6yQ</span>

New sets for Adventure Scuffle. Each set is 3 premade decks of 12 plus 9 bonus cards (45 cards), like The First Quest. Each deck mixes families with generic cards; a new mechanic only where there is real design space.

## Design rules

Every new card follows the same rules as the current 102, taken from the rulebook and the design archive.

| Rule                 | Value                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deck                 | 12 cards with at most 1 Ace (Guardian of Creation is the one card that can be a second Ace); balance is tuned card by card (SE/WE roles in drafts are notes only, never in the CSV) |
| Stat budget per deck | About 70 (FS + A + D over all 12 cards)                                                                                                                                             |
| Stats per card       | Mostly 5 or 6 in total; an Ace about 9 to 11                                                                                                                                        |
| Fighting Spirit      | Never above 3, after every bonus (Guardian of Creation, printed 4, is the one exception)                                                                                            |
| Fate Number          | Unique 3-digit number, 100 to 666, on every card (Solo Mode)                                                                                                                        |
| Ability format       | \[Condition/Cost\]: \[Effect\], with A, D and FS written after a double space                                                                                                       |
| Reprints             | The same ability on the same type on at most 3 cards; at most 2 when it looks powerful                                                                                              |
| Family cap           | At most 6 cards share a family name; Fear, the boss family, may have 7; Horde has 12 (The United Horde); Living Weapon has no cap                                                   |
| Sets                 | Like The First Quest: 3 decks plus 9 bonus cards (45 cards), with a set name. The owner decides which decks go together; codes are given per set                                    |
| Buffing other cards  | No card adds +X to other cards; only Living Weapons do. A card may still buff itself                                                                                                |
| Battle cards         | Avoided in new designs unless the theme really calls for one; no new mechanics unless there is real design space                                                                    |
| Strong effects       | Hand attack, locks and moving the opponent's cards carry a family condition or a cost, so they can't be splashed for free                                                           |

<span style="white-space:pre-wrap">**Current reprints:** Ambush: +1 FS (Duskfang Dagger, Whispering Silence, counted as powerful, so full) and Final Blow: +1 FS (Dawnbreaker, Whispering Dread, Feinting Swordswoman, now full).</span>

## Set plan

The sets follow Misha's story (the story is in the Card game lore tab). Each set is 3 decks plus 9 bonus cards; the final set is 4 decks and no bonus cards. Codes are given per set later; The First Quest keeps its codes.

| Set | Name                 | Decks                                                                     | Bonus cards                                                                          |
| --- | -------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | The First Quest      | Adventurer's Guild, Hero's Retinue, Necromancer Deck                      | 9, done                                                                              |
| 2   | The United Front     | The United Horde, The Creeping Dread, Deepdelver (completed to 12)        | 9: the 6 Cut Cards plus 3 to design                                                  |
| 3   | The Light of Courage | Anti-Incursion, Fear Descends, Falconwatch                                | 9 to design (Wildcard Wanderer and Doppelganger Thief go into sets 2 to 4)           |
| 4   | The Arms of Creation | Vault of the Worthy, Gilded Caravan, Frostpeak Clans                      | 9, including three Aces: Guardian of Creation, Crimson Blademeister, Determined Hero |
| 5   | The Entropy Cometh   | Murder of Crows, Duelists' Academy, Bastion Wardens, and the Entropy deck | none                                                                                 |

Still to design: 9 cards to complete Deepdelver, the Entropy deck, and 19 bonus cards (27 for sets 2 to 4, minus the 6 Cut Cards, Wildcard Wanderer and Doppelganger Thief). Pool total: 45 + 3 × 45 + 48 = 228 cards.

**Guardian of Creation** (Misha's third and final form, a bonus card of The Arms of Creation): a special Ace, 4/3/3. Its only ability is that it can be a deck's second Ace; it is the only card with 4 Fighting Spirit. **Crimson Blademeister** (Hannah's second card) and **Determined Hero** (the Hero of Rianz's second card) are Aces of the same set; their abilities are still to design.

**Codes and format:** only The First Quest keeps its codes for now; every other card gets its code once the decks are combined into sets. Cards are delivered as CSV in the v3.2 columns: Name_AS, Code_AS, Type_AS, FS_AS, A_AS, D_AS, Fate_AS, Ability_AS, Deck_AS, Archetype_AS, ready to import into Cardworks.

## Mixing families

The cap of 6 stays: it already makes a one-family deck impossible, since a 12-card deck can hold at most 6 cards of one family. The new cards push further toward mixing.

- **Two families per deck:** each premade mixes 2 families of 3 or 4 cards each, plus 4 to 6 generic cards.

- **Small thresholds:** bonds check for one other family card ("if another X card is on your field"), so 2 or 3 family cards already pay off and stacking more adds nothing.

- **Fellowship N** (new, Inherent or Battle): if your field has cards from N or more different families, counting no family as one: a bonus. Rewards decks that mix.

- **Free Agent** (new, Inherent): if no other card on your field shares this card's family: a bonus. Makes generic cards strong on their own.

- **Room left in current families:** Rianz 1, Falcon 1, Ghoulish 2, Deepdelver 3. Grave, Unmade and Whispering are full.

## Deck pitches

The new decks come from new regions of the Age of Magic, and their lore is yours to write (notes and gaps in <span atom="ref" ref="file/3b8f9965-5be2">Story</span>). The deck names, families and themes below are working titles only; the mechanics are the proposals to keep, change or replace. Family names are the first word of each card's name, so they are what bonds check.

| \#  | Deck                   | Region and lore (yours) | Working theme                         | Families          | New mechanic                                                                                                     | Play style                                                |
| --- | ---------------------- | ----------------------- | ------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | Wildwood Circle        |                         | Druids and their beasts               | Thorn, Wild       | **Pack:** +1 to a stat for each adjacent card from a different family                                            | Mixed boards; rewards spreading families across the field |
| 2   | Copperwheel Artificers |                         | Clockwork constructs and their makers | Clockwork, Tinker | **Wind-up:** a Field Ability that grows stronger for each round the card stayed ready                            | Patient; holds cards back to power them up                |
| 3   | Gilded Caravan         |                         | Merchants and hired swords            | Gilded, Sellsword | **Hire:** swap a card in your Support with one in your rest zone                                                 | Resource juggling, plus coin-flip gambles                 |
| 4   | Duelists' Academy      |                         | Fencers and their masters             | Rapier, Mentor    | **Riposte:** a bonus when revealed straight after an opponent's reveal                                           | Counter-play; a twin to First Blood and Ambush            |
| 5   | Stormriders            |                         | Sky raiders and weather mages         | Storm, Gale       | **Gust:** move an opponent's ready card to an empty adjacent position                                            | Disruption; breaks the opponent's defensive lines         |
| 6   | Stillwater Monastery   |                         | Monks and pilgrims                    | Still, Lotus      | <span style="white-space:pre-wrap">**Meditate:** a Support card not used last round gets +1 FS this round</span> | Slow build; strong late rounds                            |
| 7   | Frostpeak Clans        |                         | Mountain warriors and beasts          | Frost, Peak       | **Endure:** an active card stays on the field at Regroup instead of going to Support                             | Sturdy boards that keep their best cards in place         |
| 8   | Masquerade Troupe      |                         | Tricksters and performers             | Masked, Jester    | **Masked:** the card is placed face down; its ability fires when it is flipped                                   | Bluffing and surprise                                     |
| 9   | Tidecallers            |                         | Sea priests and moon cultists         | Tide, Moon        | **Tide:** bonuses that switch between odd and even rounds                                                        | Timing; plans around the round count                      |

Each deck also uses existing keywords for most of its cards (positional, Battle conditions, reveal order, bonds, archetype conditions, Rest conditions, costs, lockouts), and one Ace.

**Pitch decisions:** rejected: Wind-up (Copperwheel Artificers), Gust (Stormriders), Meditate (Stillwater Monastery) and Masked (Masquerade Troupe); they clashed with the rules as they stand (no card stays ready across rounds, the field has no empty positions, unused Support is rested at Regroup, every field card already starts face down). Tide (Tidecallers) is set aside: odd and even rounds are already tracked by Initiative and No-Initiative, since the initiative passes each round. Pack (Wildwood Circle) is okay. Hire (Gilded Caravan) is drafted.

## Deck draft: Fear Descends

Fear, the Solo-only boss deck, made playable for normal games: 6 Fear cards (Fear Incarnate as the Ace, plus 5 of its parts) and 6 cultists who serve it. Decks are made one at a time; the 9 pitches stay as ideas to draw on.

**New mechanics**

- **Debuff tokens** (from the boss deck): a token on a field card lowers its A or D by 1. The card that places it says which stat; "a debuff token" lets the player who places it choose. Tokens stack, a stat never goes below 0, they never affect FS, and all of them clear at the start of the Regroup Phase.

- **Terror N+** (new keyword): if the opponent's field has N or more debuff tokens: \[effect\]. Checked continuously on Inherent Abilities, once at reveal on Battle Abilities, and as a gate on Field, Support and Rest Abilities, like other conditions.

**The 12 cards** (the family comes from the name, as for every other family)

| Name                      | Family | Role | Type     | FS/A/D | Fate | Ability                                                                                                                            |
| ------------------------- | ------ | ---- | -------- | ------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Fear Incarnate {ace}      | Fear   | Ace  | Field    | 2/3/3  | 106  | Place a debuff token on 2 target cards on the opponent's field.                                                                    |
| Fear the Burning Eye      | Fear   | SE   | Flip     | 1/2/2  | 153  | Flip Ability: Place a debuff token on the opponent's field card with the highest Attack Value, reducing its Attack Value.          |
| Fear the Watching Eye     | Fear   | SE   | Battle   | 2/2/2  | 347  | Attacking Side: Place a debuff token on a defending card on the opponent's field, reducing its Defense Value.                      |
| Fear the Rending Claw     | Fear   | SE   | Field    | 1/3/1  | 172  | Terror 2+: Target a ready card on the opponent's field. It is turned to the ability-active position without resolving its ability. |
| Fear the Coiling Tentacle | Fear   | WE   | Support  | 2/2/2  | 613  | Terror 2+: Opponent rests a card from their Support.                                                                               |
| Fear the Core             | Fear   | WE   | Battle   | 1/2/3  | 395  | <span style="white-space:pre-wrap">+1 FS for every 2 debuff tokens on the opponent's field (at most +2 FS).</span>                 |
| Cult Recruiter            | Cult   | WE   | Inherent | 3/1/2  | 284  | <span style="white-space:pre-wrap">Center: +1 D. If a Fear card is also on your field: +1 A.</span>                                |
| Cult Zealot               | Cult   | WE   | Battle   | 1/2/2  | 127  | <span style="white-space:pre-wrap">Terror 2+: +1 FS.</span>                                                                        |
| Cult Doomcaller           | Cult   | SE   | Field    | 2/2/1  | 431  | Rest 1: Place a debuff token on a card on the opponent's field.                                                                    |
| Cult Initiate             | Cult   | WE   | Rest     | 2/2/1  | 644  | <span style="white-space:pre-wrap">Terror 1+: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>     |
| Cult Ritualist            | Cult   | WE   | Battle   | 2/2/2  | 528  | <span style="white-space:pre-wrap">If a Fear card was revealed as Fighting Spirit this Engagement: +1 FS.</span>                   |
| Cult High Priest          | Cult   | SE   | Inherent | 1/2/2  | 219  | <span style="white-space:pre-wrap">Terror 3+: +1 A and +1 D.</span>                                                                |

**Checks**

- **Stats:** 68 in total (the Ace 8, the rest 5 or 6), just under budget.

- **Types:** 4 Battle, 3 Field, 2 Inherent, 1 Flip, 1 Support, 1 Rest.

- **Fighting Spirit cap:** the highest possible is 3 (Fear the Core at 1 + 2, Cult Initiate at 2 + 1, Cult Zealot at 1 + 1).

- <span style="white-space:pre-wrap">**Reprints:** no ability repeats an existing card's. Fear the Rending Claw's lock is Grave Keeper's, but with a Terror condition instead of Rest 1; Cult Recruiter revives your prototype (Center: +1 D, 3 FS) with a Fear bond added.</span>

- **Fate Numbers:** all unused; the lowest go to the attackers (the Ace, Zealot, Burning Eye, Rending Claw), as Solo Mode ranks by Fate.

- **How it plays:** Doomcaller, the Ace and the Eyes put tokens out; Terror cards switch on at 2 or 3 tokens; tokens also lower the opponent's real Attack and Defense, so even without payoffs they help win Engagements.

**Decided:** the deck is Fear Descends; Fear Incarnate stays a Field Ace (one strong action) and starts at 2 tokens, with 3 on 3 different cards tested in the Balance lab once tokens are in the engine. The Role column (Ace, SE, WE) is a drafting aid only: it stays out of the CSV, since balance is tuned card by card.

**Fear Incarnate's tokens, assessed:** using its Field Ability makes Fear Incarnate ability-active, so its own 3 A or 3 D sits out the round; 2 tokens take only 2 from the opponent, so on raw numbers the action costs more than it removes. Its value is in aiming (2 tokens on the Main Attacker swing that Engagement by 2), in switching on Terror 2+ for four cards at once, and in lasting the whole round. For comparison, Saboteur Guard's free "opponent rests a Support card" was among the strongest cards in the lab, and Grave Keeper's Rest 1 lock was almost never picked. **Recommendation:** test 2 and 3 tokens in the Balance lab once tokens are in the engine; if deciding now, 3 tokens on 3 different cards (it also switches on the High Priest's Terror 3+, and "different cards" stops a 3-point swing on one attacker).

**Change to an existing card: Unassuming Mage (TFQ-37, Bonus Ace).** It becomes the answer to Fear. Fate Number 524 → **305** (305 was unused, between Sunlight Guardian 304 and Necromancer of Rotos 306). New text, still Inherent, 3/1/1:

> <span style="white-space:pre-wrap">If opponent has an Ace on their field: +3 A and +3 D. If opponent has a Fear card on their field: In the Skirmish, each time you get a response opportunity, you may first swap this card's position with another card on your field.</span>

<span style="white-space:pre-wrap">Rulings: it works only while the Mage is face up; the swap comes before your response and doesn't use it up; at most one swap per response window, in every window; it swaps with any card on your field, face up or face down; the Mage stays Ready. Swaps happen before combat starts, so they decide which stacks form. Against Fear Descends, Fear Incarnate is both an Ace and a Fear card, so the Mage gets +3 A and +3 D and moves freely. Ships with Fear Descends in the engine, since "Fear card" exists only from then.</span>

**Change to The First Quest: a Fear card joins its Bonus cards (approved).** So the Mage has an enemy in the base set, Fear arrives early, as a shadow of what comes in Fear Descends. It takes Wildcard Wanderer's slot and code; Wildcard Wanderer moves unchanged to the new bonus cards. Fear now has 7 cards (the cap exception above).

| Code   | Name                  | Family | Type | FS/A/D | Fate | Ability                                                                                                                         |
| ------ | --------------------- | ------ | ---- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| TFQ-45 | Fear the First Shadow | Fear   | Flip | 1/3/2  | 313  | Flip Ability: Target an Ace on the opponent's field. It is turned to the ability-active position without resolving its ability. |

Why this design: it needs no debuff tokens, so The First Quest stays token-free. It hunts Aces, the Mage's own trigger, so the two are rivals: the opponent reveals this card, and if their Ace is not face up yet, the Flip finds no target and does nothing, so they want to find the Shadow first. Its Fate 313 sits next to the Mage's 305. Reprints: the lock is Hunter Dragoon's and Falcon Strider's, but as a Flip and only on an Ace. Stats 6, on budget; it replaces a 6 (Wildcard Wanderer 1/3/2), so TFQ's Bonus total stays the same.

**Change to existing cards: Adventurer's Guild becomes half Adventuring.** The Guild's strongest cards were generic, so every optimized deck splashed them (Haughty Knight 14 of 20 decks, Vigilant Ranger 11, Hunter Dragoon 7). Six of them become the **Adventuring** family (the adventurers of the Adventurer's Guild), named so the family comes from the name. Codes, stats and Fate Numbers stay the same; Adventuring is at the cap of 6.

| Code   | Was                  | Now                       | Ability                                                                                                                                                                                                                |
| ------ | -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TFQ-06 | Vigilant Ranger      | Adventuring Ranger        | Flip Ability, if an Adventuring card is also on your field: Opponent rests a card from their Support.                                                                                                                  |
| TFQ-07 | Master Archer        | Adventuring Marksman      | Opponent rests a card from their Support. _(unchanged)_                                                                                                                                                                |
| TFQ-08 | Spatial Witch        | Adventuring Witch         | Swap target opponent's ready card on the field with a random card from their Support. The card that enters the field inherits the state of the card it swapped with. The card it swapped with is rested. _(unchanged)_ |
| TFQ-09 | Guild Quarter Master | Adventuring Quartermaster | Swap a card on your field with a card from your Support. The card placed on the field is Ready. _(unchanged)_                                                                                                          |
| TFQ-10 | Haughty Knight       | Adventuring Knight        | Flip Ability, if an Adventuring card is also on your field: Swap the target opponent's card's position with another card on their field.                                                                               |
| TFQ-12 | Hunter Dragoon       | Adventuring Dragoon       | Rest 1: Target opponent's card on the field is turned to the ability-active position without resolving its ability.                                                                                                    |

The other six Guild cards stay generic: Crimson Duelist, Spirited Knight, Spiritforged Monk, Strategic Vanguard, Decoy Ninja, Mission Handler. The threshold is one other Adventuring card, so the premade (6 Adventuring cards) almost always switches them on, while an open deck has to bring a second one. Marksman and Witch keep their text: using them already costs their body for the round. Next candidates for the same treatment: the Hero's Retinue staples Azure Assassin and Saboteur Guard (Rianz has one slot left). This is errata on printed TFQ cards: Cardworks and printed copies need updating, and earlier lab results no longer compare directly.

**Change to The First Quest: a Living Weapon joins its Bonus cards.** TFQ-44 becomes **Living Weapon Dusk** (Rest, 1/2/1, Fate 437): "No-Initiative: Attach this card to a ready card on your field." Doppelganger Thief (never picked in the lab, the most complex text in TFQ) moves unchanged to the new bonus cards. See Living Weapon below.

## Deck draft: Duelists' Academy

Fencers (Rapier) and the masters who train them (Mentor), with four generic academy cards. A counter-play deck: it wins the Fighting Spirit back-and-forth by answering, not by opening. Names are working titles; the lore is yours.

**New mechanic**

<span style="white-space:pre-wrap">**Riposte** (new Battle keyword): `Riposte: [+N] FS`. The bonus applies if the card revealed just before this one this Engagement was a Battle card revealed by your opponent. It completes the reveal-order family: **First Blood** (nothing revealed yet), **Riposte** (you answer their Battle card), **Ambush** (they have passed), **Final Blow** (you reveal last).</span>

How often it is on: only when the opponent's last card was a Battle card, about a third of the pool, so the bonus stays +1, or +2 with a second condition. The counters: reveal a non-Battle card first, or pass early and lock in your total. That is the deck's tension.

**The 12 cards** (4 Rapier, 4 Mentor, 4 generic; Mentors teach Rapiers, so their bonds check for a Rapier card)

| Name                  | Family | Role | Type     | FS/A/D | Fate | Ability                                                                                                                                                            |
| --------------------- | ------ | ---- | -------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rapier Virtuoso {ace} | Rapier | Ace  | Battle   | 1/4/4  | 132  | <span style="white-space:pre-wrap">First Blood: +1 FS. Riposte: +2 FS.</span>                                                                                      |
| Rapier Adept          | Rapier | SE   | Battle   | 1/3/2  | 158  | <span style="white-space:pre-wrap">Riposte: +1 FS. If a Mentor card is also on your field: +1 FS.</span>                                                           |
| Rapier Fencer         | Rapier | WE   | Battle   | 1/2/3  | 517  | <span style="white-space:pre-wrap">Riposte, Defending Side: +2 FS.</span>                                                                                          |
| Rapier Second         | Rapier | WE   | Rest     | 2/2/1  | 414  | <span style="white-space:pre-wrap">Riposte: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>                                       |
| Mentor of the Blade   | Mentor | WE   | Inherent | 2/3/1  | 224  | <span style="white-space:pre-wrap">If a Rapier card is also on your field: +1 A.</span>                                                                            |
| Mentor of the Guard   | Mentor | WE   | Inherent | 1/2/2  | 631  | <span style="white-space:pre-wrap">Center: +1 D. If a Rapier card is also on your field: +1 D.</span>                                                              |
| Mentor of Footwork    | Mentor | SE   | Field    | 2/2/2  | 366  | Swap the position of a Rapier card on your field with another card on your field. To choose a face-down Rapier card, show it to your opponent; it stays face down. |
| Mentor of Drills      | Mentor | WE   | Support  | 3/1/1  | 469  | Put a Rapier card from your rest zone into your Support.                                                                                                           |
| Sparring Partner      | —      | WE   | Battle   | 1/2/3  | 583  | <span style="white-space:pre-wrap">Riposte: +1 FS. Defending Side: +1 FS.</span>                                                                                   |
| Feinting Swordswoman  | —      | SE   | Battle   | 2/3/1  | 185  | <span style="white-space:pre-wrap">Final Blow: +1 FS.</span>                                                                                                       |
| Duel Challenger       | —      | SE   | Field    | 2/2/1  | 318  | Target the opponent's ready card in this card's Mirrored Position. It is turned to the ability-active position without resolving its ability.                      |
| Challenge Herald      | —      | WE   | Flip     | 2/2/1  | 271  | Flip Ability: Your opponent reveals a random card from their Support to you.                                                                                       |

**Checks**

- **Stats:** 70 in total (the Ace 9, the rest 5 or 6), on budget.

- **Types:** 5 Battle, 2 Field, 2 Inherent, 1 Rest, 1 Support, 1 Flip.

- **Fighting Spirit cap:** the highest possible is 3 (the Ace at 1 + 2; First Blood and Riposte can't both be on. Adept 1 + 1 + 1, Fencer 1 + 2, Sparring Partner 1 + 1 + 1, Second 2 + 1, Swordswoman 2 + 1).

- <span style="white-space:pre-wrap">**Reprints:** Riposte is new. Final Blow: +1 FS reaches its third and last copy (Dawnbreaker, Whispering Dread, Feinting Swordswoman). Mentor of Footwork is the third Field swap-a-family-card (after Grave Reclaimer and Unmade Vessel), aimed at another family. Challenge Herald is the first Flip with the Support-peek; Duel Challenger's lock is new (free, but only on the card facing it). Mentor of Drills is a narrower Priestess of Rianz.</span>

- **Family cap:** 4 Rapier, 4 Mentor; both have room to grow to 6 later.

- **Fate Numbers:** all unused. The lowest go to the attackers (Virtuoso, Adept, Swordswoman, Mentor of the Blade), the highest to the defenders (Fencer, Sparring Partner, Mentor of the Guard).

**How it plays**

On the field, Mentor of the Blade and Mentor of the Guard grow next to a Rapier, Mentor of Footwork moves a Rapier into the stack that needs it, and Duel Challenger trades itself for the card facing it. In combat the deck wants the opponent to keep revealing: every Battle card they reveal can be answered with a Riposte, Rapier Second comes back from the rest zone to answer again, and Feinting Swordswoman closes. Challenge Herald shows one Support card, so the Duelists know whether a Battle card is coming.

**Decided**

Riposte is narrowed to answering a Battle card; the Ace stays a Rapier (Rapier Virtuoso, a Battle Ace); Duel Challenger's lock stays free; Mentor of Drills stays plain.

## Deck draft: Frostpeak Clans

Mountain warriors (Frost) and the beasts of the high passes (Peak), with four generic mountain cards. A sturdy deck that keeps its best cards on the field from round to round, and trades a smaller Support for it. Names are working titles; the lore is yours.

**New mechanic**

**Endure** (new keyword, written like Unbound: `Endure.` or `[Condition]: Endure.`): at Regroup, before active cards move to Support, you may keep this card on the field. It stays in its position, turned face down, and becomes Ready again, so it is revealed again in the Skirmish; debuff tokens still clear. The condition is checked at Regroup.

What it costs and gives: an enduring card skips Support, so next round your Support is one card smaller (fewer Fighting Spirit cards) and the refill takes one card fewer from your rest zone (a bigger rest zone). The opponent saw it last round, so they may remember what is in that position. In return a strong card fights every round, and a Field card that endures can use its Field Ability again next round. The deck's payoffs use existing wording: "If you have 3 or fewer cards in Support" and "3+ Rest Zone".

<span style="white-space:pre-wrap">**Design rule (decided):** a card whose text starts with Endure has no other ability. It pays for staying with plain, solid stats: 3 A and 3 D with 1 FS, and 2 FS for the Ace. A conditional Endure ("If a Frost card is also on your field: Endure.") is likewise the card's only ability, at normal stats.</span>

**The 12 cards** (4 Frost, 4 Peak, 4 generic)

| Name               | Family | Role | Type     | FS/A/D | Fate | Ability                                                                                                                                                      |
| ------------------ | ------ | ---- | -------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frost Jarl {ace}   | Frost  | Ace  | Inherent | 2/3/3  | 617  | Endure.                                                                                                                                                      |
| Frost Shieldmaiden | Frost  | WE   | Inherent | 1/2/3  | 538  | If a Frost card is also on your field: Endure.                                                                                                               |
| Frost Raider       | Frost  | SE   | Battle   | 1/3/2  | 134  | <span style="white-space:pre-wrap">Attacking Side: +1 FS. If you have 3 or fewer cards in Support: +1 FS.</span>                                             |
| Frost Binder       | Frost  | SE   | Field    | 2/2/1  | 337  | Rest 1: Target a ready card on the opponent's field. At Regroup, it stays on the field instead of going to Support.                                          |
| Peak Ram           | Peak   | WE   | Battle   | 1/3/1  | 109  | <span style="white-space:pre-wrap">Attacking Side, Initiative: +2 FS.</span>                                                                                 |
| Peak Yeti          | Peak   | SE   | Inherent | 1/3/3  | 178  | Endure.                                                                                                                                                      |
| Peak Eagle         | Peak   | WE   | Rest     | 2/2/1  | 376  | <span style="white-space:pre-wrap">If you have 3 or fewer cards in Support: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span> |
| Peak Shepherd      | Peak   | WE   | Support  | 2/2/1  | 441  | No-Initiative: Put a card from your rest zone into your Support. This card is not rested after use.                                                          |
| Mountain Hermit    | —      | WE   | Battle   | 1/2/3  | 487  | <span style="white-space:pre-wrap">Defending Side: +1 FS. If you have 3 or fewer cards in Support: +1 FS.</span>                                             |
| Glacier Guard      | —      | WE   | Inherent | 1/3/3  | 592  | Endure.                                                                                                                                                      |
| Snowblind Tracker  | —      | SE   | Flip     | 2/2/1  | 289  | Flip Ability: Swap the positions of two face-down cards on the opponent's field.                                                                             |
| Cliffside Watcher  | —      | WE   | Inherent | 2/2/1  | 233  | <span style="white-space:pre-wrap">3+ Rest Zone: +1 A and +1 D.</span>                                                                                       |

**Checks**

- **Stats:** 70 in total. The plain Endure cards are 1/3/3 (Yeti, Glacier Guard) and 2/3/3 (the Ace, 8, below the usual Ace range on purpose: it is a solid body, not a bomb); the rest are 5 or 6.

- **Types:** 5 Inherent, 3 Battle, 1 Field, 1 Rest, 1 Support, 1 Flip. Inherent runs high, since the plain Endure cards have no ability type of their own.

- **Fighting Spirit cap:** the highest possible is 3 (Raider 1 + 1 + 1, Ram 1 + 2, Hermit 1 + 1 + 1, Eagle 2 + 1).

- **Reprints:** Endure is new. Peak Shepherd is Dawnlight Scepter with No-Initiative instead of Initiative. Snowblind Tracker is a narrower Haughty Knight (two face-down cards only).

- **Family cap:** 4 Frost, 4 Peak; both have room to grow to 6.

- **Fate Numbers:** all unused. The lowest go to the attackers (Ram, Raider, Yeti, Cliffside Watcher), the highest to the defenders (Hermit, Shieldmaiden, Glacier Guard, Frost Jarl).

**How it plays**

<span style="white-space:pre-wrap">Round 1 plays normally. From round 2 the Clans keep their wall: Frost Jarl, Peak Yeti and Glacier Guard (3 A and 3 D each) are plain, solid cards that stay put, and Frost Shieldmaiden stays with them while a Frost card is on the field. A smaller Support switches on Raider, Hermit and Peak Eagle, and the rest zone starts each round with one card per enduring card (you choose which, since you choose the refill), so three enduring cards switch on Cliffside Watcher from the start. Frost Binder freezes an opponent's card in place, so it stays known and their Support shrinks too. Snowblind Tracker scrambles the opponent's hidden placement before it's revealed.</span>

**Decided**

Endure is optional ("you may keep"). An enduring card is turned face down at Regroup and revealed again in the Skirmish; only memory tells the opponent what it is. Frost Binder costs Rest 1. Frost Shieldmaiden keeps its Frost condition at 6 stats. Watch in the Balance lab: a frozen Field card comes back Ready, and a frozen Flip card fires its Flip Ability again when it is revealed, so Frost Binder can help the opponent.

## Deck draft: Gilded Caravan

Merchants (Gilded) and the hired swords who guard them (Sellsword), with four generic road cards. A recursion deck: it pays costs with its own cards, then buys them back. Names are working titles; the lore is yours.

**New mechanic**

**Hire** (new keyword, named before a colon with its rule spelled out, like Echo Bond): `Hire: Swap a card in your Support with a card in your rest zone.` You need a card in each place. It trades card quality, not card count: your Support stays the same size (unlike Priestess of Rianz, which adds a card).

Why it works: the rest zone is small during a round (it starts empty and fills from costs and the opponent's "rests a card" effects), so the Caravan fills it itself. Sellswords pay Rest costs for strong effects; Gilded cards hire the rested cards back. Hire on a Battle card works mid-combat, so you can pull a strong card back for your next Fighting Spirit reveal.

**The 12 cards** (4 Gilded, 4 Sellsword, 4 generic; the bonds cross over, merchants and their guards)

| Name                         | Family    | Role | Type     | FS/A/D | Fate | Ability                                                                                                                                                                     |
| ---------------------------- | --------- | ---- | -------- | ------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gilded Merchant-Prince {ace} | Gilded    | Ace  | Field    | 2/3/3  | 249  | Hire: Swap up to two cards in your Support with cards in your rest zone.                                                                                                    |
| Gilded Broker                | Gilded    | SE   | Support  | 3/1/1  | 362  | Once per round, Hire: Swap a card in your Support with a card in your rest zone. If a Sellsword card is also on your field, this card does not need to be rested after use. |
| Gilded Gambler               | Gilded    | WE   | Battle   | 1/2/3  | 263  | <span style="white-space:pre-wrap">Flip a coin when revealed: Heads: +1 FS. Tails, Hire: Swap a card in your Support with a card in your rest zone.</span>                  |
| Gilded Ledger-Keeper         | Gilded    | WE   | Inherent | 1/2/3  | 561  | <span style="white-space:pre-wrap">If a Sellsword card is in your rest zone: +1 D.</span>                                                                                   |
| Sellsword Blade              | Sellsword | SE   | Battle   | 1/3/1  | 117  | <span style="white-space:pre-wrap">Rest 1: +2 FS.</span>                                                                                                                    |
| Sellsword Veteran            | Sellsword | WE   | Inherent | 1/3/2  | 142  | <span style="white-space:pre-wrap">2+ Rest Zone: +1 A.</span>                                                                                                               |
| Sellsword Mercenary          | Sellsword | SE   | Field    | 2/2/2  | 326  | Rest 1: Target a ready card on the opponent's field. It is turned to the ability-active position without resolving its ability.                                             |
| Sellsword Deserter           | Sellsword | WE   | Rest     | 2/2/2  | 479  | <span style="white-space:pre-wrap">If a Gilded card is in your rest zone: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>                  |
| Caravan Guard                | —         | WE   | Battle   | 1/2/3  | 608  | <span style="white-space:pre-wrap">Defending Side: Flip a coin. Heads: +2 FS.</span>                                                                                        |
| Lucky Peddler                | —         | WE   | Support  | 2/2/1  | 405  | Flip a coin. Heads: Put a card from your rest zone into your Support. This card is not rested after use. Tails: nothing happens.                                            |
| Toll Collector               | —         | SE   | Flip     | 2/2/1  | 297  | Flip Ability, Hire: Swap a card in your Support with a card in your rest zone.                                                                                              |
| Pack Mule                    | —         | WE   | Rest     | 2/2/2  | 456  | <span style="white-space:pre-wrap">Initiative: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>                                             |

**Checks**

- **Stats:** 70 in total (the Ace 8, the rest 5 or 6), on budget. No 4s.

- **Types:** 3 Battle, 2 Field, 2 Support, 2 Inherent, 2 Rest, 1 Flip.

- **Fighting Spirit cap:** the highest possible is 3 (Sellsword Blade 1 + 2, Caravan Guard 1 + 2, Deserter 2 + 1, Pack Mule 2 + 1; Broker's 3 is printed).

- **Reprints:** Hire is new. Sellsword Mercenary is Grave Keeper's lock (second copy). Caravan Guard and Gilded Gambler are new coin combinations; Lucky Peddler is a coin-flip Priestess of Rianz. Battle with a Rest cost (Sellsword Blade) is new to the pool.

- **Family cap:** 4 Gilded, 4 Sellsword; both have room to grow to 6.

- **Fate Numbers:** all unused. The lowest go to the attackers (Sellsword Blade, Sellsword Veteran, the Ace, Gilded Gambler), the highest to the defenders (Deserter, Ledger-Keeper, Caravan Guard).

**How it plays**

<span style="white-space:pre-wrap">In the Skirmish, Sellsword Mercenary pays Rest 1 to lock an opponent's card; Gilded Broker and the Merchant-Prince then hire the rested cards back, so the costs come home. A full rest zone switches on Sellsword Veteran, Ledger-Keeper (a Sellsword resting) and Deserter (a Gilded card resting). In combat, Sellsword Blade pays a card for +2 FS, and Gilded Gambler either adds 1 or, on tails, hires a strong card back for your next reveal. Three coin cards keep the gamble in the deck's identity.</span>

**Decided**

Hiring a card out of your Support counts as resting it, so Runaway Familiar can't be hired out (it goes back to Support) or paid as a cost. A face-down card in the rest zone (turned by Kobold Grave-Robber or Kobold Trapsetter) can't be hired back. The Merchant-Prince keeps its two swaps. Gilded Broker keeps its once-per-round keep-it rider.

## Deck draft: Bastion Wardens (defensive)

Fortress knights (Bastion) and the priests who ward the walls (Aegis), with four generic garrison cards. A defensive deck: its defenders reach the attacked position from anywhere on the field, but each one pays a cost or needs a condition. Names are working titles; the lore is yours. Takes the tracker slot of the rejected Stormriders.

**New mechanic**

**Interpose** (new keyword): `Interpose.`, `[Condition]: Interpose.` or `Rest N: Interpose.` If this card is defending, it joins your defense stack wherever it is on your field, even if it is not on or next to the attacked position. It is a one-card Defense Unbound.

- **Condition form:** checked continuously, like Unbound. If it is true when the stacks form, the card joins then; if it turns true during combat (for example "Lost Previous Engagement" in the Second Engagement), the card joins at once, at its locked values.

- **Cost form:** paid once, when the stacks form (Attack/Defense Assignment step 8), by resting N cards from your Support. Inherent abilities can carry costs like any other (owner's ruling). Interpose sits on Inherent cards because a Field Ability would make the card ability-active, and it couldn't defend.

- Only a defending card can Interpose; attackers never do.

Why it works: the defense stack is normally only the defenders on or next to the attacked position, and the opponent's Main Attacker picks that position. Interpose lets the Wardens hold back their best defenders anywhere and still bring them to the fight, so the opponent can't dodge them by attacking the far side. The cost and the conditions keep it from being a free Defense Unbound.

**The 12 cards** (4 Bastion, 4 Aegis, 4 generic)

| Name                      | Family  | Role | Type     | FS/A/D | Fate | Ability                                                                                                                                        |
| ------------------------- | ------- | ---- | -------- | ------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Bastion High Warden {ace} | Bastion | Ace  | Inherent | 2/3/3  | 573  | <span style="white-space:pre-wrap">If a Bastion card is also on your field: Interpose. If your defense stack has 3 or more cards: +2 D.</span> |
| Bastion Shieldbearer      | Bastion | WE   | Inherent | 1/2/3  | 619  | Rest 1: Interpose.                                                                                                                             |
| Bastion Sentinel          | Bastion | WE   | Inherent | 1/2/3  | 637  | No-Initiative: Interpose.                                                                                                                      |
| Bastion Squire            | Bastion | WE   | Battle   | 1/2/3  | 302  | <span style="white-space:pre-wrap">Defending Side: +1 FS. If an Aegis card is also on your field: +1 FS.</span>                                |
| Aegis Wardwright          | Aegis   | SE   | Field    | 2/2/1  | 205  | Target a ready card on your field. This round, it has Interpose.                                                                               |
| Aegis Chaplain            | Aegis   | SE   | Support  | 2/2/1  | 433  | Rest 1: Target a ready card on the opponent's field. It cannot be their Main Attacker this round.                                              |
| Aegis Warder              | Aegis   | WE   | Rest     | 2/2/2  | 585  | <span style="white-space:pre-wrap">Defending Side: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>            |
| Aegis Lightkeeper         | Aegis   | WE   | Battle   | 1/1/3  | 548  | <span style="white-space:pre-wrap">Defending Side, if your defense stack has 3 or more cards: +2 FS.</span>                                    |
| Gate Guard                | —       | WE   | Inherent | 1/2/3  | 659  | Lost Previous Engagement: Interpose.                                                                                                           |
| Tower Archer              | —       | SE   | Battle   | 1/2/2  | 147  | <span style="white-space:pre-wrap">Defending Side, First Blood: +2 FS.</span>                                                                  |
| Wall Mason                | —       | SE   | Field    | 1/3/2  | 168  | Swap a ready card's position with another ready card on your field.                                                                            |
| Sally Captain             | —       | WE   | Inherent | 2/3/1  | 121  | <span style="white-space:pre-wrap">Flank: +1 A.</span>                                                                                         |

**Checks**

- **Stats:** 70 in total (the Ace 8, the rest 5 or 6), on budget. No 4s.

- **Types:** 5 Inherent, 3 Battle, 2 Field, 1 Support, 1 Rest.

- **Fighting Spirit cap:** the highest possible is 3 (Squire 1 + 1 + 1, Lightkeeper 1 + 2, Warder 2 + 1). Tower Archer 1 + 2 = 3.

- **Reprints:** Interpose is new. Aegis Chaplain's Main Attacker block is new. Wall Mason is Ridge Watcher's swap as a Field Ability. Defending Side as a Rest condition and "your defense stack has 3 or more cards" are new.

- **Family cap:** 4 Bastion, 4 Aegis.

- **Fate Numbers:** all unused. The defenders get the highest (Ace 573, Warder 585, Shieldbearer 619, Sentinel 637, Gate Guard 659), so they reliably land in the defending half; Sally Captain, Tower Archer and Wall Mason attack.

**How it plays**

<span style="white-space:pre-wrap">The Wardens stack defense. Shieldbearer pays a card, Sentinel comes free in the rounds you don't have the initiative, the Ace comes whenever another Bastion card is out, and Gate Guard arrives as a comeback after you lose the First Engagement. Aegis Wardwright gives Interpose to any card for a round. Aegis Chaplain pays Rest 1 to block the opponent's best Main Attacker, which changes where their attack comes from. A stack of 3 or more switches on the Ace's +2 D and Lightkeeper's +2 FS. Sally Captain and Tower Archer make sure the deck can still score on its own attack.</span>

**Decided**

Inherent abilities can have a cost (owner's ruling; the rulebook's Costs section, which says "any non-Inherent ability", gets updated with the engine PR). Aegis Chaplain needed a cost: blocking a Main Attacker shuts one position the attack can come from, so it now costs Rest 1, on top of the Support card resting itself after use. The attacker with the next-lowest Fate Number becomes Main Attacker instead. The deck name stays Bastion Wardens for now.

## Deck draft: Murder of Crows (Support and Flip only)

A ninja and assassin clan: the Ravens strike from hiding (all Flip cards) and the Crows scout and run (all Support cards), with four generic cards. Only Support and Flip cards, since the pool was short on both. No new mechanic: every effect exists in the pool already, combined with existing conditions and costs. The deck is Murder of Crows (a flock of crows, and a nod to the assassins). Takes the tracker slot of the rejected Masquerade Troupe.

Identity: it wins the Skirmish, not the Fighting Spirit duel. It has no Fighting Spirit bonuses, so it makes sure the board is decided before combat starts: the opponent's key cards locked, their defenders moved off the attacked position, your own cards in the stacks that matter, and their hand known. Its disruption is mostly locks, moves and information, with a single hand attack, and its strong effects are locked to the families (the rule above).

| Name                  | Family | Type    | FS/A/D | Fate | Ability                                                                                                                                                                                                                                |
| --------------------- | ------ | ------- | ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raven Matriarch {ace} | Raven  | Flip    | 1/3/3  | 137  | Flip Ability: Target a ready card on the opponent's field. It is turned to the ability-active position without resolving its ability. If a Crow card is also on your field: Swap this card's position with another card on your field. |
| Raven Infiltrator     | Raven  | Flip    | 2/2/2  | 181  | Flip Ability, if a Crow card is also on your field: Swap target opponent's ready card on the field with a random card from their Support. The card that enters the field inherits the state of the card it swapped with.               |
| Raven Striker         | Raven  | Flip    | 1/3/2  | 112  | Flip Ability, if a Crow card is also on your field: Swap the target opponent's card's position with another card on their field.                                                                                                       |
| Raven Blade           | Raven  | Flip    | 1/3/2  | 104  | Flip Ability: This card is included in your attacking group this round, regardless of its Fate Number rank.                                                                                                                            |
| Crow Scout            | Crow   | Support | 2/2/2  | 314  | Your opponent reveals a random card from their Support to you. If a Raven card is also on your field, this card does not need to be rested after use.                                                                                  |
| Crow Decoy            | Crow   | Support | 2/2/2  | 492  | Swap this card's position with another card on your field. This card inherits the state of the card it swapped with.                                                                                                                   |
| Crow Courier          | Crow   | Support | 3/1/1  | 371  | Swap a card on your field with a card from your Support. The card placed on the field is Ready.                                                                                                                                        |
| Crow Spotter          | Crow   | Support | 3/2/1  | 427  | Once per round: Swap a ready card's position with another ready card on your field. This card is not rested after use.                                                                                                                 |
| Crow Saboteur         | Crow   | Support | 2/2/1  | 578  | Initiative: Opponent rests a card from their Support.                                                                                                                                                                                  |
| Rooftop Lookout       | —      | Flip    | 2/2/1  | 226  | Flip Ability: Your opponent reveals a random card from their Support to you.                                                                                                                                                           |
| Snare Weaver          | —      | Flip    | 2/2/2  | 259  | Flip Ability: Target a face-down ready card on the opponent's field. It is turned to the ability-active position without resolving its ability.                                                                                        |
| Smoke Runner          | —      | Support | 2/2/2  | 533  | Rest 1: Swap the target opponent's card's position with another card on their field.                                                                                                                                                   |

**Checks**

- **Types:** 6 Flip, 6 Support.

- **Stats:** 70 in total (the Ace 7, the rest 5 or 6). No 4s.

- **Fighting Spirit:** no bonuses at all; the highest is a printed 3 (Courier, Spotter).

- **Families:** 4 Raven, 5 Crow, 3 generic.

- **Disruption:** 2 locks (the Ace, Snare Weaver), 3 moves (Infiltrator, Striker, Smoke Runner), 2 information (Crow Scout, Rooftop Lookout), 1 hand attack (Crow Saboteur). Generic ones are narrow or costed: Snare Weaver only hits face-down cards, Smoke Runner pays Rest 1.

- **Reprints (built from):** the Ace is Falcon Strider's lock as a Flip with Nimble Outrider's move as a rider; Infiltrator is Azure Assassin gated (2nd copy); Striker is Haughty Knight gated; Raven Blade is Howling Barbarian (2nd copy); Crow Scout follows Whispering Bond; Crow Decoy is Light Dragoon; Crow Courier is Guild Quarter Master's swap as a Support card; Crow Spotter is Mission Handler (2nd copy); Rooftop Lookout is Challenge Herald (2nd copy); Smoke Runner is Prayerful Devotee's effect as a Support card.

- **Fate Numbers:** all unused. Attackers are low (Raven Blade 104, Striker 112, the Ace 137).

- **The first Flip Ace.**

**How it plays**

As the opponent reveals the Ravens, they spring: the Matriarch locks a key card, Striker pulls a defender out of place, Infiltrator swaps a field card with one from their hand. The Crows work from your Support: Decoy and Spotter put your own cards where the stacks will form, Courier brings the right card onto the field, and Scout shows you what they hold. Snare Weaver can defuse the opponent's own Flip trap: a face-down card in the ability-active position doesn't Flip when it is revealed.

**Decided**

The Matriarch stays as written (it's the Ace). Raven Infiltrator is gated on a Crow card; Caltrop Thrower became Crow Saboteur. The deck is named Murder of Crows.

## New mechanic: Living Weapon

Weapons forged from concepts at the beginning of everything, waiting for someone worthy. **Living Weapon** is an archetype (the whole phrase, since Weapon Master has "Weapon" in its name); every member is named "Living Weapon \[Concept\]" and the archetype has no cap. Weapons are Rest or Support cards with all stats 1 except one 2 (the Ace excepted). Only one or two check for another Living Weapon; the rest work in any deck.

- **Attach:** "Attach this card to a ready card on your field." The weapon is tucked under its host and adds its Attack and Defense to it (Fighting Spirit doesn't apply on the field).

- **Skirmish only:** weapons attach only during the Skirmish, never in combat. Support weapons attach in a response window like any Support Ability; Rest weapons attach from the rest zone in a response window.

- **One weapon per card.** If the host leaves the field, the weapon falls off to the rest zone. A weapon on a locked or ability-active host does nothing.

- **An attached weapon isn't a field card:** it doesn't count for "If a \[family\] card is also on your field" and can't be targeted on its own.

- **Face down:** you may arm your own face-down card; only face-up cards on the opponent's side.

- **On the opponent's side** a weapon only restricts, never lowers stats (that stays Fear's).

- **After combat** every weapon goes to the rest zone, then follows the normal Regroup refill (the rest zone empties into the field, so weapons come back as field cards, then to Support).

- **Payoff wording:** "If a Living Weapon is attached to this card: …"

## Deck draft: Vault of the Worthy

The Living Weapons and the **Armigers**, their guardians, who keep them until someone worthy claims them. On its own the deck is fair but modest; its parts are meant to make other decks stronger (two or three weapons and a Bestower in any deck). Heartsong is an Ace, so splashing it costs that deck its own Ace.

| Name                          | Family        | Type    | FS/A/D | Fate | Ability                                                                                                                                                  |
| ----------------------------- | ------------- | ------- | ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Living Weapon Heartsong {ace} | Living Weapon | Support | 2/2/2  | 342  | Attach this card to a ready card on your field.                                                                                                          |
| Living Weapon Dawn            | Living Weapon | Rest    | 1/1/2  | 385  | Initiative: Attach this card to a ready card on your field.                                                                                              |
| Living Weapon Sacrifice       | Living Weapon | Rest    | 2/1/1  | 393  | Rest 1: Attach this card to a ready card on your field.                                                                                                  |
| Living Weapon Remembrance     | Living Weapon | Rest    | 2/1/1  | 412  | 3+ Rest Zone: Attach this card to a ready card on your field. That card has Interpose.                                                                   |
| Living Weapon Kinship         | Living Weapon | Rest    | 1/2/1  | 335  | If a Living Weapon is attached to a card on your field: Attach this card to a ready card on your field.                                                  |
| Living Weapon Doubt           | Living Weapon | Support | 1/1/2  | 401  | No-Initiative: Attach this card to a face-up card on the opponent's field. It cannot be their Main Attacker this round.                                  |
| Armiger Custodian             | Armiger       | Support | 2/2/2  | 378  | Rest up to two Living Weapons from your Support.                                                                                                         |
| Armiger Bestower              | Armiger       | Field   | 2/2/2  | 350  | Rest 1: Attach a Living Weapon from your rest zone to a ready card on your field.                                                                        |
| Armiger Warden                | Armiger       | Support | 1/2/3  | 424  | Target a ready card on your field with a Living Weapon attached. This round, it cannot be the target of an opponent's ability.                           |
| Armiger Page                  | Armiger       | Support | 2/2/2  | 363  | Target a Living Weapon on your field. Put it in your rest zone, and put this card in its position. This card inherits the state of the card it replaced. |
| Armiger Proctor               | Armiger       | Flip    | 2/2/2  | 356  | Flip Ability: You may attach a Living Weapon from your Support to a ready card on your field.                                                            |
| Armiger Trialmaster           | Armiger       | Support | 2/2/2  | 369  | Target a ready card on your field with a Living Weapon attached. It is included in your attacking group this round, regardless of its Fate Number rank.  |

**Checks**

- **Stats:** 63 (weapons 4 each, Heartsong 6, Armigers 6 each), below 70 on purpose.

- **Types:** 6 Support, 4 Rest, 1 Field, 1 Flip, no Battle.

- **Families:** Living Weapon 6 here plus Dusk in TFQ (no cap); Armiger 6 (at cap).

- **Fate Numbers:** middle of the road (335 to 424, Dusk 437), so in a mixed deck they fall where that deck pushes them. All unused.

- **Getting weapons into the rest zone:** Armiger Custodian, the Rest 1 costs of Bestower and Sacrifice, and Armiger Page (a weapon left on the field goes back to the rest zone and the Page takes its place). Proctor attaches straight from your Support.

**Decided:** the weapons are named for concepts; the Armigers can carry weapons too; no Inherent and no Battle cards among the Armigers; the Ace is a Support weapon that only adds its stats.

## Remake: The United Horde (was The Banded Horde)

Four races that settled their differences and now charge as one: Orcs hit hard, Goblins move fast, Kobolds trap, Sahuagin hold the line. A relentless but organized charge: a lot of swapping within the Horde to build the formation, then attack. The card names stay for now; every ability is new. No new mechanic and no Battle cards.

- **Horde** is the archetype: all 12 cards print it (the v2.2 printed-archetype rule), and it is the one archetype with 12 cards. The races are flavor only.

- **Ruling:** "cannot be repositioned" covers every swap, including being swapped out of the field.

| Name                        | Race     | Type     | FS/A/D | Fate | Ability                                                                                                                                                                  |
| --------------------------- | -------- | -------- | ------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Warchief of the Horde {ace} | —        | Inherent | 2/3/3  | 152  | Horde cards on your field cannot be repositioned by an opponent's ability.                                                                                               |
| Orc Berserker               | Orc      | Inherent | 1/3/2  | 103  | <span style="white-space:pre-wrap">If a Horde card is next to this card: +1 A.</span>                                                                                    |
| Goblin Ambusher             | Goblin   | Field    | 1/3/2  | 123  | Swap this card's position with another Horde card on your field.                                                                                                         |
| Goblin Skulker              | Goblin   | Flip     | 2/2/2  | 144  | Flip Ability: Swap the position of a Horde card on your field (this card included) with another card on your field.                                                      |
| Kobold Grave-Robber         | Kobold   | Field    | 2/2/1  | 201  | Rest 1, if another Horde card is on your field: Target a card in opponent's rest zone. Turn it face down. It cannot be used for a Rest Ability for the rest of the game. |
| Kobold Scavenger            | Kobold   | Rest     | 2/1/2  | 250  | <span style="white-space:pre-wrap">If two or more Horde cards are in your attack stack: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span> |
| War Drummer                 | —        | Support  | 3/1/1  | 299  | Once per round: Swap the positions of two Horde cards on your field. This card is not rested after use.                                                                  |
| Kobold Skirmisher           | Kobold   | Rest     | 2/2/1  | 348  | <span style="white-space:pre-wrap">If a Horde card is also on your field: You may use this card for Fighting Spirit this Engagement. It gets +1 FS.</span>               |
| Kobold Trapsetter           | Kobold   | Field    | 2/2/2  | 398  | Rest 1, if another Horde card is on your field: Target a card in opponent's rest zone. Turn it face down. It cannot be used to refill their field during Regroup Phase.  |
| Orc Provisioner             | Orc      | Support  | 2/2/2  | 496  | Put a Horde card from your rest zone into your Support.                                                                                                                  |
| Sahuagin Reef-Strider       | Sahuagin | Support  | 2/2/2  | 594  | Swap a Horde card on your field with a card from your Support. The card placed on the field is Ready.                                                                    |
| Sahuagin Undertow           | Sahuagin | Inherent | 2/2/2  | 643  | <span style="white-space:pre-wrap">If a Horde card is next to this card: +1 D.</span>                                                                                    |

**Checks**

- **Stats:** 70 (the Ace 8). No 4s.

- **Types:** 3 Inherent, 3 Support, 3 Field, 2 Rest, 1 Flip, no Battle.

- **Swapping:** War Drummer, Goblin Skulker, Goblin Ambusher and Sahuagin Reef-Strider move Horde cards; Berserker and Undertow reward Horde cards standing next to each other (they buff only themselves); the Warchief keeps the formation from being broken.

- **Archetype lock:** the Kobolds' rest-zone denial now needs another Horde card on your field.

- **Fate Numbers:** attackers lowest (Berserker, Ambusher, Skulker, the Warchief), line-holders highest (Reef-Strider, Undertow); mostly the old Banded Horde numbers, all unused elsewhere.

**Change to an existing card: Unmade Wretch (The Creeping Dread).** It turned an opponent's field card face down during the Skirmish, which broke the reveal rules (re-revealing, the chain of revealed cards, Flip Abilities firing twice, the Skirmish ending only when all cards are face up). "Turn it face down" is dropped; it becomes the standard lock, since that is what it did, at Rest 1 with an Unmade condition (so it differs from Grave Keeper and follows the archetype-lock rule):

> Unmade Wretch, Field, 2/2/2: "Rest 1, if an Unmade card is also on your field: Target opponent's card. It is turned to the ability-active position without resolving its ability."

Rule from now on: no card turns a field card face down during the Skirmish.

## Bonus cards

Six cards outside the premades, designed last, once the decks show what the pool is missing.

- **2 generic mixers:** one Fellowship card and one Free Agent card, playable in any deck.

- **4 family top-ups:** one each for Rianz, Falcon, Ghoulish and Deepdelver, which brings Rianz and Falcon to the cap of 6.

- **No Ace** among them, so the pool ends with 17 Aces (8 now plus 9 new).

**Wildcard Wanderer** (moved from TFQ-45, unchanged: Flip 1/3/2, Fate 216, "Flip Ability: Swap a card on your field with a card from your Support. The card placed on the field is Ready."). The bonus batch stays at 6 cards: Wildcard Wanderer, Doppelganger Thief (moved from TFQ-44) and four more, designed when we get there (the ideas above are a starting point, one fewer slot). The pool plan stays at 216: Fear the First Shadow is the 114th new card.

## Deck tracker

All ten batches are at the pitch stage; the status moves as each deck goes through the steps below.

| \#  | Deck                        | Cards             | Status                                                           |
| --- | --------------------------- | ----------------- | ---------------------------------------------------------------- |
| 1   | Wildwood Circle             | 12                | <span atom="enum" enum="3ea27658-af7c" index="0">Pitch</span>    |
| 2   | Copperwheel Artificers      | 12                | <span atom="enum" enum="3ea27658-af7c" index="0">Pitch</span>    |
| 3   | Gilded Caravan              | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 4   | Duelists' Academy           | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 5   | Bastion Wardens             | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 6   | Stillwater Monastery        | 12                | <span atom="enum" enum="3ea27658-af7c" index="0">Pitch</span>    |
| 7   | Frostpeak Clans             | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 8   | Murder of Crows             | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 9   | Vault of the Worthy         | 12                | <span atom="enum" enum="3ea27658-af7c" index="1">Drafting</span> |
| 10  | Bonus cards                 | 27 (19 to design) | <span atom="enum" enum="3ea27658-af7c" index="0">Pitch</span>    |
| 11  | The United Horde (remake)   | 12                | Drafting                                                         |
| 12  | Deepdelver (complete to 12) | 9 new             | To design                                                        |
| 13  | Entropy (final evil deck)   | 12                | To design                                                        |

## How each deck gets made

One deck at a time, once you have approved the pitches:

1.  **Draft:** I write the 12 cards in this doc (name, type, FS/A/D, Fate Number, ability, role, family) and check the stat budget and the reprint rule.

2.  **Review:** you comment on any card; I revise until you are happy.

3.  **Engine:** a PR adds the new keyword to the rules engine, the card reader and the bots, adds the cards with a test for every ability, and bumps the version (a new keyword is a feature bump).

4.  **Balance:** a Balance lab run against the current pool; anything flagged too strong or too weak comes back here.

5.  **Cardworks:** you get the CSV to import, and the deck joins the game pack.

New keywords also go into the rulebook's Keywords section, worded in the same style as the existing ones.
