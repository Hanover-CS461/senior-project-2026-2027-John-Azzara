
# Coaching & Tactics

Coaching decisions influence pace, shot selection, and defensive intensity.

---

## 🎛 Tactic Modifiers

Examples:

- **Fast Pace** → more possessions, lower accuracy  
- **Slow Pace** → fewer possessions, higher accuracy  
- **High Pressure Defense** → more turnovers, more fouls  

```js
function applyTactics(baseProbability, tactics) {
  if (tactics.pace === "fast") baseProbability -= 0.03;
  if (tactics.defense === "pressure") baseProbability -= 0.02;
  return baseProbability;
}
