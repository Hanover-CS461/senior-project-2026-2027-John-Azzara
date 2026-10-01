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
