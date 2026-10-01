
# Player Performance & Fatigue

Fatigue ensures players decline realistically over time.

---

## 😓 Fatigue Model

Fatigue increases each possession:

```js
function applyFatigue(player, currentFatigue) {
  const newFatigue = currentFatigue + 0.15; // per possession
  const penalty = newFatigue * 0.5; // reduces ratings
  return { newFatigue, penalty };
}

boxScore[player.id].fgAttempts++;
if (madeShot) boxScore[player.id].fgMade++;

