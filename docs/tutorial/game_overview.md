# Game Simulation Overview

A simulated basketball game is driven by a loop of possessions. Each possession evaluates ratings, tactics, fatigue, and randomness to determine the outcome.

---

## 🏀 What the Simulation Uses
Before the game starts, the engine loads:

- Team offensive & defensive ratings
- Player attributes (shooting, passing, defense, stamina)
- Coaching modifiers
- Tactic selections (pace, shot tendency, defensive pressure)
- Random seed for unpredictable outcomes

---

## 🔄 High-Level Game Flow
1. Initialize game state  
2. Loop through possessions  
3. Determine shot type  
4. Calculate shot success  
5. Apply fatigue  
6. Update stats  
7. Switch possession  
8. Repeat until time expires  

---

## 🧪 Example: Initial Game State

```js
const gameState = {
  homeScore: 0,
  awayScore: 0,
  possession: "home",
  timeRemaining: 40 * 60, // 40 minutes
  fatigue: {},
  boxScore: {}
};
