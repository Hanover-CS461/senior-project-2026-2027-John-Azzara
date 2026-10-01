
# Box Score Generation

At the end of the game, the engine compiles stats into a readable box score.

---

## 🧮 Example Box Score Structure

```js
{
  "Player A": {
    minutes: 32,
    points: 18,
    fgMade: 7,
    fgAttempts: 14,
    rebounds: 6,
    assists: 4
  }
}

function generateBoxScore(boxScore) {
  return Object.entries(boxScore).map(([player, stats]) => {
    return `${player}: ${stats.points} pts, ${stats.rebounds} reb, ${stats.assists} ast`;
  });
}
