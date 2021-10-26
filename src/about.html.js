module.exports = `
<p>
  Joyce Dominoes is a game inspired by the memory of Joyce Wilson (1933-2019).
  Grandma Joyce is one of my heroes. She taught me how to be decent with people
  when I was young and how to be gracious despite adversity as an adult. She
  absolutely adored us grandchildren and always had a supply of ginger ale and
  Klondike bars to treat us with. On the other hand, her background as a teacher
  meant she would never let us get too far out of line.
</p>
<p>
  Every year for over 20 years, we would travel to Oceanside to spend time as a
  family. In the evening after dinner, we would play dominoes in a style I've
  never seen exactly replicated. Here are the rules:
</p>
<b>Joyce Dominoes</b><br>
Every player receives number of bones (dominoes).
<i>Setup</i>
<ul>
<li>Play with a 9x9 domino set.</li>
<li>Number of players determines number of initial pieces
<ol>
<li>2-4 - 9</li>
<li>5-6 - 8</li>
<li>7-8 - 6</li>
</ol></li>
<li>Players can pick their pieces but they don't know what's under them (mostly random but if you happen to observe pieces from previous rounds you can get an advantage)</li>
<li>Bone pile is remaining pieces</li>
<li>Players can organize their pieces however they like to remember what order they want to play in or to trick other players into thinking they have an order</li>
</ul>

<i>Start of play</i>
<ul>
<li>Play each of the double pieces descending from 9x9 to 0x0</li>
<li>If no one has the targeted double:
<ol>
<li>See if anyone has the next lowest double that hasn’t been used yet (e.g. looking for double 6, no one has it, look for double 5 if it hasn’t already started a game)</li>
<li>If no one has any of the remaining unused doubles, everyone draws a bone and the target matching process begins again</li>
<li>If there are not enough bones, have the players with the lowest scores draw a bone and repeat the above process</li>
</ol></li>
<li>Player who played piece must follow rules on playing a double below (see “each turn” rules)</li>
<li>Turns go clockwise from starting player</li>
</ul>

<i>Each turn</i>
<ul>
<li>Each player should play a domino from their hand on either their line or another player’s line that has a penny</li>
<li>To play a domino, one side of it must match the number of pips on the end of the line they want to play on</li>
<li>If you play a domino on another player’s line and do have another domino that could be used on your line, then you state “could play on my own, but am instead playing on X’s” where X is the other player</li>
<li>If you play a domino on another player’s line and do not have a domino that could be used on your line, then you must put a penny on your line</li>
<li>If a player plays on their line, they can remove a penny if present</li>
<li>If a player has no domino to play, they must add a penny to their line, draw a bone and add it to their hand</li>
<li>Special rules for playing doubles:
<ul>
<li>If played with another domino with the same number of pips on one side, rules are the same as normal</li>
<li>If played without another domino, you must put a penny on your line, but you do not have to draw a bone</li>
</ul></li>
<li>Players must always play if they have an eligible domino</li>
</ul>

<i>Win condition per round</i>
<ul>
<li>Player must state that they are “walking” when they have one piece remaining and it can be played unconditionally (e.g. on their domino line with no pennies present). If they do not, another player can call them out and if they are actually walking, they must draw two dominoes.</li>
<li>No remaining pieces</li>
<li>Round score is derived from the number of pips remaining in their hand</li>
</ul>

Overall winner is the player with the lowest sum of all round scores.`;
