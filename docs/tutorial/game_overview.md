# Game Simulation Overview

A single simulated basketball game is driven by a loop of **possessions**, where each possession evaluates ratings, tactics, fatigue, and randomness to determine outcomes.

---

## 🏀 What the Simulation Looks At
Before the game begins, the engine loads:

- Team offensive & defensive ratings  
- Player attributes (shooting, passing, defense, stamina)  
- Coaching modifiers  
- Tactic selections (pace, shot tendency, defensive pressure)  
- Random seed for unpredictable outcomes  

These values influence every possession.

---

## 🔄 High-Level Flow
1. Initialize game state  
2. Loop through possessions  
3. Determine shot type  
4. Calculate shot success probability  
5. Apply fatigue modifiers  
6. Update stats  
7. Switch possession  
8. Repeat until time expires  

---

## 🧪 Example: Initial Game State (JavaScript)

```js
const gameState = {
  homeScore: 0,
  awayScore: 0,
  possession: "home",
  timeRemaining: 40 * 60, // 40 minutes
  fatigue: {},
  boxScore: {}
};
