
import './style.css'

// Main Menu
document.querySelector('#app').innerHTML = `
  <div class="main-menu">
    <div class="arena-lights"></div>

    <div class="menu-content">
      <div class="basketball">🏀</div>

      <div class="game-label">THE ROAD TO GLORY</div>

      <h1>COLLEGE BASKETBALL<br>
        <span>MANAGER</span>
      </h1>

      <p class="subtitle">
        Build Your Program. Create Your Legacy.
      </p>

      <div class="menu-buttons">
        <button id="new-game">🏆 New Game</button>
        <button id="load-game">📂 Load Game</button>
        <button id="settings">⚙ Settings</button>
      </div>
    </div>

    <div class="footer">
      COLLEGE BASKETBALL MANAGER
    </div>
  </div>
`

// New Game Button
document.querySelector('#new-game').addEventListener('click', () => {
  document.querySelector('#app').innerHTML = `
    <div class="main-menu">
      <div class="arena-lights"></div>

      <div class="menu-content">
        <div class="basketball">🏀</div>

        <div class="game-label">BEGIN YOUR JOURNEY</div>

        <h1>NEW <span>CAREER</span></h1>

        <p class="subtitle">
          Build your program and lead your team to glory.
        </p>

        <div class="coach-setup">
          <label for="coach-name">Coach Name</label>
          <input
            type="text"
            id="coach-name"
            placeholder="Enter your name"
            maxlength="30"
          />
        </div>

        <div class="menu-buttons">
          <button id="back-button">
            Back to Main Menu
          </button>
        </div>
      </div>

      <div class="footer">
        COLLEGE BASKETBALL MANAGER
      </div>
    </div>
  `

  // Back to Main Menu Button
  document.querySelector('#back-button').addEventListener('click', () => {
    window.location.reload()
  })
})
