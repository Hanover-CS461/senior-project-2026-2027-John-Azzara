# Possession Model

The possession model is the core of the simulation. Each possession represents one offensive opportunity.

---

## 🔢 Step 1: Determine Shot Type

Shot type is influenced by:

- Player tendencies
- Team tactics
- Defensive pressure

Example weighted selection:

```js
function chooseShotType(player) {
  const weights = {
    layup: player.insideRating,
    midrange: player.midRating,
    three: player.threeRating
  };

  const total = weights.layup + weights.midrange + weights.three;
  const rand = Math.random() * total;

  if (rand < weights.layup) return "layup";
  if (rand < weights.layup + weights.midrange) return "midrange";
  return "three";
}

function shotSuccess(player, defender, fatiguePenalty) {
  const base = player.shootingRating - defender.defenseRating;
  const adjusted = base - fatiguePenalty;
  const probability = Math.max(0.05, Math.min(0.75, adjusted / 100));
  return Math.random() < probability;
}

function updateGameState(state, madeShot, shotType, team) {
  if (madeShot) {
    const points = shotType === "three" ? 3 : 2;
    state[team + "Score"] += points;
  }
  state.possession = team === "home" ? "away" : "home";
}
```
Next: [Player Performance & Fatigue](player-preformance.md)

Previous: [Game Overview](game_overview.md)  
