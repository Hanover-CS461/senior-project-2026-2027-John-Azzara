
import './style.css'
import { rosters } from './rosters.js'
import { calculateOverall } from './ratings.js'
import {
  generateSECSchedule,
  getTeamSchedule,
  getRoundGames,
  getNextGame
} from './schedule.js'
import {
  createGame,
  simulatePossession,
  simulateGame,
  getGameResult,
  formatClock
} from './simulation.js'

const app = document.querySelector('#app')

const teams = [
  'Alabama', 'Arkansas', 'Auburn', 'Florida',
  'Georgia', 'Kentucky', 'LSU', 'Mississippi State',
  'Missouri', 'Ole Miss', 'Oklahoma', 'South Carolina',
  'Tennessee', 'Texas', 'Texas A&M', 'Vanderbilt'
]

const positions = ['PG', 'SG', 'SF', 'PF', 'C']
const lineups = {}
const rotations = {}
const tactics = {}

const defaults = {
  pace: 'Balanced',
  offense: 'Balanced',
  defense: 'Man-to-Man',
  substitutions: 'Balanced'
}

let matchup = { home: '', away: '' }
let career = null

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character])
}

function options(values, selected = '') {
  return values.map(value => `
    <option value="${escapeHTML(value)}"
      ${value === selected ? 'selected' : ''}>
      ${escapeHTML(value)}
    </option>
  `).join('')
}

function button(id, label, primary = false) {
  return `
    <button id="${id}"
      class="broadcast-button ${primary ? 'primary' : ''}">
      <span>${label}</span>
      <span class="button-arrow">›</span>
    </button>
  `
}

function back(id, label = 'BACK') {
  return `<button id="${id}" class="back-button">‹ ${label}</button>`
}

function title(section, heading, subtitle = '') {
  return `
    <div class="broadcast-titlebar">
      <span class="title-orb"><span class="orb-center"></span></span>
      <div class="title-text">
        <span class="section-label">${section}</span>
        <h1>${heading}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
      <span class="titlebar-sec">SEC</span>
    </div>
  `
}

function screen(html, page = 'inner-screen') {
  app.innerHTML = `
    <div class="game-shell">
      <header class="broadcast-header">
        <button id="home-logo" class="broadcast-brand">
          <span class="broadcast-orb"><span></span></span>
          <span class="brand-text">
            <strong>COLLEGE BASKETBALL</strong>
            <small>MANAGER</small>
          </span>
        </button>
        <div class="header-details">
          <span>SEC BASKETBALL</span>
          <span class="header-separator"></span>
          <span>2026–27</span>
        </div>
      </header>

      <main class="game-content ${page}">
        ${html}
      </main>

      <footer class="broadcast-ticker">
        <span class="ticker-label">CBM</span>
        <span>COLLEGE BASKETBALL MANAGER</span>
        <span class="ticker-divider">◆</span>
        <span>SOUTHEASTERN CONFERENCE</span>
        <span class="ticker-divider">◆</span>
        <span>THE ROAD TO GLORY</span>
        <span class="ticker-season">2026–27</span>
      </footer>
    </div>
  `

  document.querySelector('#home-logo').onclick = showMainMenu
}

function on(id, callback) {
  document.getElementById(id)?.addEventListener('click', callback)
}

function getPlayers(team) {
  const rosterKeys = {
    'Mississippi State': 'MississippiState',
    'Ole Miss': 'OleMiss',
    'South Carolina': 'SouthCarolina',
    'Texas A&M': 'TexasAM'
  }

  const key = rosterKeys[team] || team

  return Array.isArray(rosters[key]) ? rosters[key] : []
}


function getTeamOverall(team) {
  const players = getPlayers(team)

  if (players.length < 5) return '--'

  const topFive = players
    .map(player => calculateOverall(player))
    .sort((a, b) => b - a)
    .slice(0, 5)

  return Math.round(
    topFive.reduce((sum, rating) => sum + rating, 0) / 5
  )
}


function readyRoster(team) {
  return getPlayers(team).length >= 5
}

function playerText(player, position = player.position) {
  return `${calculateOverall(player, position)} OVR | #${player.number ?? '--'} ${player.name} (${player.position ?? '?'})`
}

function average(lineup, players) {
  const ratings = positions.map(position => {
    const index = lineup[position]

    return Number.isInteger(index) && players[index]
      ? calculateOverall(players[index], position)
      : null
  })

  if (ratings.some(rating => rating === null)) return '--'

  return Math.round(
    ratings.reduce((sum, rating) => sum + rating, 0) / 5
  )
}

function bestLineup(players) {
  let best = null
  let bestScore = -Infinity

  function search(positionIndex, chosen, used, score) {
    if (positionIndex === 5) {
      if (score > bestScore) {
        bestScore = score
        best = { ...chosen }
      }
      return
    }

    const position = positions[positionIndex]

    for (let index = 0; index < players.length; index++) {
      if (used.has(index)) continue

      used.add(index)
      chosen[position] = index

      search(
        positionIndex + 1,
        chosen,
        used,
        score + calculateOverall(players[index], position)
      )

      used.delete(index)
    }
  }

  search(0, {}, new Set(), 0)
  return best
}

function ensureLineup(team) {
  if (!readyRoster(team)) return null

  if (!lineups[team]) {
    lineups[team] = bestLineup(getPlayers(team))
  }

  return lineups[team]
}

function defaultRotation(team) {
  const players = getPlayers(team)
  const lineup = ensureLineup(team)

  if (!lineup) return null

  const minutes = Array(players.length).fill(0)
  const starterIndices = Object.values(lineup)

  starterIndices.forEach(index => {
    minutes[index] = 32
  })

  const bench = players
    .map((_, index) => index)
    .filter(index => !starterIndices.includes(index))

  if (bench.length > 0) {
    const base = Math.floor(40 / bench.length)
    const remainder = 40 % bench.length

    bench.forEach((index, position) => {
      minutes[index] = base + (position < remainder ? 1 : 0)
    })
  } else {
    starterIndices.forEach(index => {
      minutes[index] = 40
    })
  }

  return minutes
}

function ensureRotation(team) {
  if (!readyRoster(team)) return null

  if (
    !rotations[team] ||
    rotations[team].length !== getPlayers(team).length
  ) {
    rotations[team] = defaultRotation(team)
  }

  return rotations[team]
}

function ensureTactics(team) {
  if (!tactics[team]) {
    tactics[team] = { ...defaults }
  }

  return tactics[team]
}

function minutesTotal(minutes) {
  return minutes.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  )
}

function teamBanner(team, subtitle = '2026–27 SEASON') {
  return `
    <div class="roster-team-banner">
      <div class="roster-emblem">SEC</div>
      <div>
        <div class="small-label">SOUTHEASTERN CONFERENCE</div>
        <h2>${escapeHTML(team.toUpperCase())}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="roster-count">
        ${getPlayers(team).length} PLAYERS
      </div>
    </div>
  `
}

// MAIN MENU

function showMainMenu() {
  screen(`
    <div class="main-hero">
      <div class="hero-glow"></div>

      <div class="hero-content">
        <div class="hero-eyebrow">
          THE ULTIMATE COLLEGE BASKETBALL EXPERIENCE
        </div>

        <div class="hero-logo">
          <div class="large-orb">
            <span class="large-orb-inner"></span>
          </div>
          <div class="hero-heading">
            <span>COLLEGE</span>
            <span>BASKETBALL</span>
            <strong>MANAGER</strong>
          </div>
        </div>

        <p class="hero-subtitle">
          BUILD YOUR PROGRAM. CREATE YOUR LEGACY.
        </p>

        <div class="main-menu-buttons">
          ${button('new-game', 'NEW CAREER', true)}
          ${button('quick-game', 'QUICK GAME')}
          ${button('load-game', 'LOAD GAME')}
          ${button('settings', 'SETTINGS')}
        </div>
      </div>

      <div class="hero-decoration">
        <div class="arena-ring arena-ring-one"></div>
        <div class="arena-ring arena-ring-two"></div>
        <div class="arena-center">SEC</div>
      </div>
    </div>
  `, 'home-screen')

  on('new-game', showNewCareer)
  on('quick-game', showQuickGame)
  on('load-game', () => {
    alert('Saving and loading will be added later.')
  })
  on('settings', () => {
    alert('Settings will be added later.')
  })
}

// CAREER MODE

function showNewCareer() {
  screen(`
    ${title(
      'CAREER MODE',
      'NEW CAREER',
      'Create your coach and choose your program.'
    )}

    <div class="setup-layout">
      <div class="broadcast-panel career-panel">
        <div class="panel-heading">
          <span class="panel-number">01</span>
          COACH PROFILE
        </div>

        <div class="form-content">
          <div class="form-field">
            <label for="coach-name">COACH NAME</label>
            <input
              id="coach-name"
              type="text"
              placeholder="Enter your name"
              maxlength="30"
            >
          </div>

          <div class="form-field">
            <label for="college-select">
              SELECT PROGRAM / SEC
            </label>
            <select id="college-select">
              <option value="">Choose a college</option>
              ${options(teams)}
            </select>
          </div>

          <div class="form-actions">
            ${button('start-career', 'START CAREER', true)}
            ${back('career-back', 'MAIN MENU')}
          </div>
        </div>
      </div>

      <div class="broadcast-panel career-side-panel">
        <div class="panel-heading">THE ROAD TO GLORY</div>
        <div class="conference-emblem">SEC</div>
        <h2>YOUR PROGRAM.<br>YOUR LEGACY.</h2>
        <p>
          Take charge of an SEC basketball program and
          build toward conference success.
        </p>
      </div>
    </div>
  `)

  on('start-career', () => {
    const coach = document.querySelector('#coach-name').value.trim()
    const team = document.querySelector('#college-select').value

    if (!coach || !team) {
      alert('Enter your coach name and select a college.')
      return
    }

  career = {
  coach,
  team,
  season: 2026,
  schedule: generateSECSchedule(2026),
  currentRound: 1
}

showCareerDashboard(coach, team)
  })

  on('career-back', showMainMenu)
}

function showCareerDashboard(coach, team) {
  screen(`
    ${title(
      'CAREER MODE / OVERVIEW',
      'TEAM DASHBOARD',
      'Your program at a glance.'
    )}

    <div class="program-banner">
      <div class="program-medallion">SEC</div>

      <div class="program-info">
        <div class="small-label">SOUTHEASTERN CONFERENCE</div>
        <h2>${escapeHTML(team)}</h2>
        <p>HEAD COACH: ${escapeHTML(coach)}</p>
      </div>

      <div class="season-medallion">
        <span>SEASON</span>
        <strong>2026–27</strong>
      </div>
    </div>

    <div class="broadcast-stats">
      <div class="broadcast-stat">
        <span>OVERALL RECORD</span>
        <strong>0–0</strong>
      </div>
      <div class="broadcast-stat">
        <span>SEC RECORD</span>
        <strong>0–0</strong>
      </div>
      <div class="broadcast-stat">
        <span>SEASON</span>
        <strong>2026–27</strong>
      </div>
      <div class="broadcast-stat">
        <span>CONFERENCE</span>
        <strong>SEC</strong>
      </div>
    </div>

    <div class="dashboard-menu">
      ${button('career-roster', 'VIEW ROSTER')}
      ${button('career-schedule', 'VIEW SCHEDULE')}
      ${button('career-standings', 'SEC STANDINGS')}
    </div>

    <div class="bottom-navigation">
      ${back('dashboard-back', 'MAIN MENU')}
    </div>
  `)

  on('dashboard-back', showMainMenu)

    on('career-schedule', showCareerSchedule)

  on('career-roster', () => {
    alert('Career roster management will be connected next.')
  })

  on('career-standings', () => {
    alert('SEC standings will be added next.')
  })
}


function showCareerSchedule() {
  if (!career) {
    showNewCareer()
    return
  }

  const { coach, team, schedule } = career
  const teamGames = getTeamSchedule(schedule, team)

  screen(`
    ${title(
      'CAREER MODE / SEC SCHEDULE',
      '2026–27 SEC SCHEDULE',
      `${team} · 18 Conference Games`
    )}

    ${teamBanner(team, '2026–27 CONFERENCE SCHEDULE')}

    <div class="broadcast-stats">
      <div class="broadcast-stat">
        <span>CONFERENCE GAMES</span>
        <strong>${teamGames.length}</strong>
      </div>
      <div class="broadcast-stat">
        <span>HOME GAMES</span>
        <strong>${teamGames.filter(game =>
          game.home === team
        ).length}</strong>
      </div>
      <div class="broadcast-stat">
        <span>AWAY GAMES</span>
        <strong>${teamGames.filter(game =>
          game.away === team
        ).length}</strong>
      </div>
      <div class="broadcast-stat">
        <span>CURRENT ROUND</span>
        <strong>${career.currentRound}</strong>
      </div>
    </div>

    <div class="broadcast-panel">
      <div class="panel-heading">
        SEC REGULAR SEASON · 18 ROUNDS
      </div>

      <div class="table-scroll">
        <table class="roster-table">
          <thead>
            <tr>
              <th>ROUND</th>
              <th>LOCATION</th>
              <th>OPPONENT</th>
              <th>OPP OVR</th>
              <th>RESULT</th>
            </tr>
          </thead>

          <tbody>
            ${teamGames.map(game => {
              const isHome = game.home === team
              const opponent = isHome
                ? game.away
                : game.home

              const location = isHome
                ? 'HOME'
                : 'AWAY'

              const result = game.played
                ? `${game.homeScore}–${game.awayScore}`
                : 'NOT PLAYED'

              return `
                <tr>
                  <td>${game.round}</td>
                  <td>${location}</td>
                  <td>${escapeHTML(opponent)}</td>
                  <td>${getTeamOverall(opponent)}</td>
                  <td>${result}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="center-navigation">
      ${back('schedule-back', 'TEAM DASHBOARD')}
    </div>
  `)

  on('schedule-back', () => {
    showCareerDashboard(coach, team)
  })
}

// QUICK GAME

function showQuickGame() {
  screen(`
    ${title(
      'EXHIBITION MODE',
      'QUICK GAME',
      'One game. Two teams. Your decisions.'
    )}

    <div class="quick-intro broadcast-panel">
      <div class="quick-intro-orb">
        <div class="orb-center"></div>
      </div>

      <div class="quick-intro-text">
        <div class="small-label">
          SINGLE GAME EXHIBITION
        </div>

        <h2>IT'S GAME TIME.</h2>

        <p>
          Select two SEC teams, review their rosters,
          and prepare for a single-game simulation.
        </p>

        <div class="intro-actions">
          ${button('quick-setup', 'SET UP GAME', true)}
          ${back('quick-back', 'MAIN MENU')}
        </div>
      </div>
    </div>
  `)

  on('quick-setup', () => showQuickGameSetup())
  on('quick-back', showMainMenu)
}

function showQuickGameSetup(
  home = matchup.home,
  away = matchup.away
) {
  screen(`
    ${title(
      'QUICK GAME / TEAM SELECTION',
      'CHOOSE YOUR MATCHUP',
      'Select the home and away programs.'
    )}

    <div class="matchup-container">
      <div class="matchup-card">
        <div class="matchup-card-heading">HOME TEAM</div>
        <div class="team-roundel">H</div>

        <div class="matchup-team-name" id="home-preview">
          SELECT TEAM
        </div>

        <div class="team-conference">SEC</div>

        <div class="form-field">
          <label for="home-team">HOME PROGRAM</label>
          <select id="home-team">
            <option value="">Choose a team</option>
            ${options(teams, home)}
          </select>
        </div>
      </div>

      <div class="matchup-center">
        <div class="versus-orb">VS</div>
      </div>

      <div class="matchup-card">
        <div class="matchup-card-heading">AWAY TEAM</div>
        <div class="team-roundel">A</div>

        <div class="matchup-team-name" id="away-preview">
          SELECT TEAM
        </div>

        <div class="team-conference">SEC</div>

        <div class="form-field">
          <label for="away-team">AWAY PROGRAM</label>
          <select id="away-team">
            <option value="">Choose a team</option>
            ${options(teams, away)}
          </select>
        </div>
      </div>
    </div>

    <div class="center-navigation">
      ${button('continue-game', 'CONTINUE', true)}
      ${back('setup-back', 'QUICK GAME')}
    </div>
  `)

  const homeSelect = document.querySelector('#home-team')
  const awaySelect = document.querySelector('#away-team')

  
function update() {
  const home = homeSelect.value
  const away = awaySelect.value

  document.querySelector('#home-preview').textContent =
    home ? `${home.toUpperCase()} | ${getTeamOverall(home)} OVR` : 'SELECT TEAM'

  document.querySelector('#away-preview').textContent =
    away ? `${away.toUpperCase()} | ${getTeamOverall(away)} OVR` : 'SELECT TEAM'
}


  homeSelect.onchange = update
  awaySelect.onchange = update
  update()

  on('continue-game', () => {
    if (
      !homeSelect.value ||
      !awaySelect.value ||
      homeSelect.value === awaySelect.value
    ) {
      alert('Select two different teams.')
      return
    }

    matchup = {
      home: homeSelect.value,
      away: awaySelect.value
    }

    showMatchupOverview()
  })

  on('setup-back', showQuickGame)
}

// MATCHUP OVERVIEW

function showMatchupOverview() {
  const { home, away } = matchup

  if (!home || !away) {
    showQuickGameSetup()
    return
  }

  function status(team) {
    if (!readyRoster(team)) return 'ROSTER MISSING'

    const lineup = ensureLineup(team)
    const rotation = ensureRotation(team)

    return `${average(lineup, getPlayers(team))} STARTING OVR · ${minutesTotal(rotation)}/200 MIN · TACTICS READY`
  }

  screen(`
    ${title(
      'QUICK GAME / MATCHUP OVERVIEW',
      'MATCHUP PREVIEW',
      'Prepare both teams before starting the simulation.'
    )}

    <div class="scoreboard-frame">
      <div class="scoreboard-top">
        <span>COLLEGE BASKETBALL MANAGER</span>
        <span>EXHIBITION / SEC</span>
      </div>

      <div class="scoreboard-main">
        <div class="scoreboard-team">
          <div class="scoreboard-side">HOME</div>
          <strong>${escapeHTML(home)}</strong>
          <span>SOUTHEASTERN CONFERENCE</span>
        </div>

        <div class="scoreboard-score">0</div>
        <div class="scoreboard-orb"><span>VS</span></div>
        <div class="scoreboard-score">0</div>

        <div class="scoreboard-team">
          <div class="scoreboard-side">AWAY</div>
          <strong>${escapeHTML(away)}</strong>
          <span>SOUTHEASTERN CONFERENCE</span>
        </div>
      </div>

      <div class="scoreboard-bottom">
        <span>PRE-GAME</span>
        <strong>1ST HALF</strong>
        <strong>20:00</strong>
        <span>SEC BASKETBALL</span>
      </div>
    </div>

    <div class="pregame-status">
      <div>
        <strong>${escapeHTML(home)}</strong>
        <span>${status(home)}</span>
      </div>

      <div>
        <strong>${escapeHTML(away)}</strong>
        <span>${status(away)}</span>
      </div>
    </div>

    <div class="matchup-action-row">
      ${button('view-home-roster', 'HOME ROSTER')}
      ${button('view-away-roster', 'AWAY ROSTER')}
    </div>

    <div class="matchup-action-row">
      ${button('home-lineup', 'HOME STARTING FIVE')}
      ${button('away-lineup', 'AWAY STARTING FIVE')}
    </div>

    <div class="matchup-action-row">
      ${button('home-rotation', 'HOME ROTATION')}
      ${button('away-rotation', 'AWAY ROTATION')}
    </div>

    <div class="matchup-action-row">
      ${button('home-tactics', 'HOME TACTICS')}
      ${button('away-tactics', 'AWAY TACTICS')}
    </div>

    <div class="center-navigation">
      ${button('start-simulation', 'START GAME', true)}
      ${back('edit-matchup', 'CHANGE TEAMS')}
      ${back('overview-back', 'MAIN MENU')}
    </div>
  `)

  on('view-home-roster', () => showRoster(home))
  on('view-away-roster', () => showRoster(away))
  on('home-lineup', () => showLineup(home))
  on('away-lineup', () => showLineup(away))
  on('home-rotation', () => showRotation(home))
  on('away-rotation', () => showRotation(away))
  on('home-tactics', () => showTactics(home))
  on('away-tactics', () => showTactics(away))

  on('edit-matchup', () => showQuickGameSetup(home, away))
  on('overview-back', showMainMenu)

  on('start-simulation', () => {
    if (!readyRoster(home) || !readyRoster(away)) {
      alert(
        'Both teams need at least five players. Kentucky and Florida currently have complete rosters.'
      )
      return
    }

    if (
      [home, away].some(team =>
        minutesTotal(ensureRotation(team)) !== 200
      )
    ) {
      alert(
        'Each team needs exactly 200 assigned player-minutes.'
      )
      return
    }

    showSimulationReady()
  })
}

// ROSTER

function showRoster(team) {
  const players = getPlayers(team)

  screen(`
    ${title(
      'QUICK GAME / TEAM ROSTER',
      'TEAM ROSTER',
      'Player attributes and overall ratings.'
    )}

    ${teamBanner(team)}

    <div class="roster-layout">
      <aside class="roster-sidebar broadcast-panel">
        <div class="sidebar-title">TEAM MANAGEMENT</div>
        <div class="sidebar-link active">ROSTER</div>

        <button
          id="open-lineup"
          class="sidebar-link sidebar-button"
        >
          STARTING LINEUP ›
        </button>

        <button
          id="open-rotation"
          class="sidebar-link sidebar-button"
        >
          ROTATION ›
        </button>

        <button
          id="open-tactics"
          class="sidebar-link sidebar-button"
        >
          TACTICS ›
        </button>

        ${back('roster-back', 'MATCHUP')}
      </aside>

      <div class="roster-main broadcast-panel">
        <div class="panel-heading">
          <span class="panel-number">SEC</span>
          PLAYER RATINGS
        </div>

        <div id="roster-content"></div>
      </div>
    </div>
  `, 'inner-screen roster-screen')

  const content = document.querySelector('#roster-content')

  if (!players.length) {
    content.innerHTML = `
      <div class="empty-roster">
        <h3>ROSTER NOT AVAILABLE</h3>
        <p>Kentucky and Florida are currently supported.</p>
      </div>
    `
  } else {
    content.innerHTML = `
      <div class="table-scroll">
        <table class="roster-table">
          <thead>
            <tr>
              ${[
                '#', 'PLAYER', 'POS', 'YR', 'OVR',
                'SHO', 'FIN', 'PAS', 'DEF', 'REB', 'STA'
              ].map(label => `<th>${label}</th>`).join('')}
            </tr>
          </thead>
          <tbody id="roster-body"></tbody>
        </table>
      </div>

      <div class="roster-legend">
        OVR = Overall · SHO = Shooting ·
        FIN = Finishing · PAS = Passing ·
        DEF = Defense · REB = Rebounding ·
        STA = Stamina
      </div>
    `

    const tbody = document.querySelector('#roster-body')

    ;[...players]
  .sort((a, b) => calculateOverall(b) - calculateOverall(a))
  .forEach(player => {
      const row = document.createElement('tr')

      const values = [
        player.number,
        player.name,
        player.position,
        player.year,
        calculateOverall(player),
        player.shooting,
        player.finishing,
        player.passing,
        player.defense,
        player.rebounding,
        player.stamina
      ]

      values.forEach((value, index) => {
        const cell = document.createElement('td')
        cell.textContent = value ?? ''

        if (index === 1) {
          cell.classList.add('player-name')
        }

        if (index === 4) {
          cell.classList.add('overall-rating')
        }

        if (index >= 5 && Number(value) >= 85) {
          cell.classList.add('elite-rating')
        }

        row.appendChild(cell)
      })

      tbody.appendChild(row)
    })
  }

  on('open-lineup', () => showLineup(team))
  on('open-rotation', () => showRotation(team))
  on('open-tactics', () => showTactics(team))
  on('roster-back', showMatchupOverview)
}

// STARTING LINEUP

function showLineup(team) {
  if (!readyRoster(team)) {
    showUnavailable(team)
    return
  }

  const players = getPlayers(team)
  const current = { ...ensureLineup(team) }

  screen(`
    ${title(
      'QUICK GAME / TEAM MANAGEMENT',
      'STARTING LINEUP',
      'Choose five starters for your team.'
    )}

    ${teamBanner(team, 'SELECT YOUR STARTERS')}

    <div class="lineup-layout">
      <div class="broadcast-panel">
        <div class="panel-heading">
          <span class="panel-number">01</span>
          STARTING FIVE
        </div>

        <div class="lineup-summary">
          <div>
            <span class="lineup-summary-label">
              STARTING FIVE AVERAGE
            </span>

            <strong id="average-overall">--</strong>
            <span class="lineup-summary-unit">OVR</span>
          </div>

          <button
            id="auto-select-lineup"
            class="auto-lineup-button"
          >
            AUTO-SELECT BEST FIVE
          </button>
        </div>

        <div class="lineup-list" id="lineup-list"></div>

        <div class="lineup-footer">
          <p id="lineup-message">
            Assign a different player to each position.
          </p>

          ${button(
            'save-lineup',
            'SAVE STARTING LINEUP',
            true
          )}

          ${back('lineup-back', 'MATCHUP')}
        </div>
      </div>

      <div class="broadcast-panel">
        <div class="panel-heading">
          <span class="panel-number">02</span>
          BENCH PLAYERS
        </div>

        <div id="bench-list" class="bench-list"></div>
      </div>
    </div>
  `)

  const list = document.querySelector('#lineup-list')
  const bench = document.querySelector('#bench-list')
  const message = document.querySelector('#lineup-message')

  function render() {
    document.querySelector('#average-overall').textContent =
      average(current, players)

    list.innerHTML = ''

    positions.forEach(position => {
      const row = document.createElement('div')
      row.className = 'lineup-row'

      const badge = document.createElement('div')
      badge.className = 'lineup-position'
      badge.textContent = position

      const select = document.createElement('select')
      select.className = 'lineup-select'
      select.setAttribute(
        'aria-label',
        `${position} starter`
      )

      select.add(new Option('Select a player', ''))

      players.forEach((player, index) => {
        const option = new Option(
          playerText(player, position),
          String(index)
        )

        option.disabled = positions.some(otherPosition =>
          otherPosition !== position &&
          current[otherPosition] === index
        )

        select.add(option)
      })

      select.value = Number.isInteger(current[position])
        ? String(current[position])
        : ''

      select.onchange = () => {
        current[position] = select.value === ''
          ? ''
          : Number(select.value)

        message.textContent = 'Unsaved changes'
        render()
      }

      row.append(badge, select)
      list.appendChild(row)
    })

    bench.innerHTML = ''

    players.forEach((player, index) => {
      if (Object.values(current).includes(index)) return

      const row = document.createElement('div')
      row.className = 'bench-player'

      const name = document.createElement('span')
      name.textContent = playerText(player)

      const status = document.createElement('span')
      status.className = 'bench-status'
      status.textContent = 'BENCH'

      row.append(name, status)
      bench.appendChild(row)
    })
  }

  render()

  on('auto-select-lineup', () => {
    Object.assign(current, bestLineup(players))

    message.textContent =
      'Best starting five selected. Save to confirm.'

    render()
  })

  on('save-lineup', () => {
    const selected = positions.map(
      position => current[position]
    )

    if (
      selected.some(index => !Number.isInteger(index)) ||
      new Set(selected).size !== 5
    ) {
      message.textContent =
        'Choose five different players.'
      return
    }

    const changed = positions.some(position =>
      lineups[team][position] !== current[position]
    )

    lineups[team] = { ...current }

    if (changed) {
      rotations[team] = defaultRotation(team)
    }

    showMatchupOverview()
  })

  on('lineup-back', showMatchupOverview)
}

// PLAYER ROTATIONS

function showRotation(team) {
  if (!readyRoster(team)) {
    showUnavailable(team)
    return
  }

  const players = getPlayers(team)
  const lineup = ensureLineup(team)
  const minutes = [...ensureRotation(team)]

  screen(`
    ${title(
      'QUICK GAME / TEAM MANAGEMENT',
      'PLAYER ROTATION',
      'Allocate exactly 200 player-minutes for a 40-minute game.'
    )}

    ${teamBanner(team, 'PLAYING TIME / 40 MINUTE GAME')}

    <div class="broadcast-panel rotation-panel">
      <div class="panel-heading">
        <span class="panel-number">03</span>
        ROTATION MINUTES
      </div>

      <div class="rotation-summary">
        <div>
          <span>ASSIGNED MINUTES</span>
          <strong id="minutes-total">0 / 200</strong>
        </div>

        <div>
          <span>MINUTES REMAINING</span>
          <strong id="minutes-left">0</strong>
        </div>
      </div>

      <div class="rotation-help">
        Each player can play 0–40 minutes.
        Starters are marked STARTER; all others are BENCH.
        Your saved rotation will be used by the simulation.
      </div>

      <div class="rotation-table-wrap">
        <table class="rotation-table">
          <thead>
            <tr>
              <th>PLAYER</th>
              <th>ROLE</th>
              <th>OVR</th>
              <th>MINUTES</th>
            </tr>
          </thead>

          <tbody id="rotation-body"></tbody>
        </table>
      </div>

      <div class="rotation-actions">
        ${button('auto-rotation', 'AUTO-ASSIGN MINUTES')}
        ${button('save-rotation', 'SAVE ROTATION', true)}
        ${back('rotation-back', 'MATCHUP')}
      </div>

      <p
        class="rotation-message"
        id="rotation-message"
      ></p>
    </div>
  `)

  const tbody = document.querySelector('#rotation-body')
  const message = document.querySelector('#rotation-message')
  const starters = new Set(Object.values(lineup))

  function updateTotal() {
    const total = minutesTotal(minutes)

    document.querySelector('#minutes-total').textContent =
      `${total} / 200`

    document.querySelector('#minutes-left').textContent =
      String(200 - total)

    document.querySelector('#minutes-total').classList.toggle(
      'rotation-invalid',
      total !== 200
    )
  }

  function render() {
    tbody.innerHTML = ''

    players.forEach((player, index) => {
      const row = document.createElement('tr')

      const name = document.createElement('td')
      name.textContent =
        `#${player.number ?? '--'} ${player.name}`

      const role = document.createElement('td')
      role.textContent = starters.has(index)
        ? 'STARTER'
        : 'BENCH'

      const overall = document.createElement('td')
      overall.textContent = calculateOverall(player)

      const minuteCell = document.createElement('td')
      const input = document.createElement('input')

      input.type = 'number'
      input.min = '0'
      input.max = '40'
      input.step = '1'
      input.value = minutes[index]
      input.className = 'rotation-minute-input'

      input.setAttribute(
        'aria-label',
        `${player.name} minutes`
      )

      input.addEventListener('input', () => {
        const value = Number(input.value)

        minutes[index] = input.value === ''
          ? 0
          : Number.isFinite(value) ? value : 0

        message.textContent = 'Unsaved changes'
        updateTotal()
      })

      minuteCell.appendChild(input)
      row.append(name, role, overall, minuteCell)
      tbody.appendChild(row)
    })

    updateTotal()
  }

  render()

  on('auto-rotation', () => {
    const suggested = defaultRotation(team)

    suggested.forEach((value, index) => {
      minutes[index] = value
    })

    message.textContent =
      'Suggested rotation applied. Save to confirm.'

    render()
  })

  on('save-rotation', () => {
    if (
      minutes.some(value =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 40
      )
    ) {
      message.textContent =
        'Use whole numbers between 0 and 40 for every player.'
      return
    }

    if (minutesTotal(minutes) !== 200) {
      message.textContent =
        'The total must be exactly 200 player-minutes.'
      return
    }

    rotations[team] = [...minutes]
    showMatchupOverview()
  })

  on('rotation-back', showMatchupOverview)
}

// COACHING TACTICS

function showTactics(team) {
  if (!readyRoster(team)) {
    showUnavailable(team)
    return
  }

  const current = { ...ensureTactics(team) }

  const fields = [
    {
      key: 'pace',
      label: 'OFFENSIVE PACE',
      values: ['Slow', 'Balanced', 'Fast'],
      help: 'Slow favors deliberate possessions; Fast creates more possessions.'
    },
    {
      key: 'offense',
      label: 'OFFENSIVE FOCUS',
      values: ['Balanced', 'Inside', 'Outside'],
      help: 'Inside emphasizes finishing; Outside emphasizes shooting.'
    },
    {
      key: 'defense',
      label: 'DEFENSIVE SCHEME',
      values: [
        'Man-to-Man',
        '2-3 Zone',
        'Full-Court Press'
      ],
      help: 'Man-to-Man is balanced; Zone protects the paint; Press seeks turnovers.'
    },
    {
      key: 'substitutions',
      label: 'SUBSTITUTION STYLE',
      values: [
        'Conservative',
        'Balanced',
        'Frequent'
      ],
      help: 'Controls how aggressively the simulation rotates players.'
    }
  ]

  screen(`
    ${title(
      'QUICK GAME / COACHING',
      'COACHING TACTICS',
      'Set your team strategy before tipoff.'
    )}

    ${teamBanner(team, 'GAME PLAN')}

    <div class="broadcast-panel tactics-panel">
      <div class="panel-heading">
        <span class="panel-number">04</span>
        GAME PLAN
      </div>

      <div class="tactics-grid">
        ${fields.map(field => `
          <div class="tactic-field">
            <label for="tactic-${field.key}">
              ${field.label}
            </label>

            <select id="tactic-${field.key}">
              ${options(
                field.values,
                current[field.key]
              )}
            </select>

            <p>${field.help}</p>
          </div>
        `).join('')}
      </div>

      <div class="rotation-actions">
        ${button(
          'reset-tactics',
          'RESET TO BALANCED'
        )}

        ${button(
          'save-tactics',
          'SAVE TACTICS',
          true
        )}

        ${back('tactics-back', 'MATCHUP')}
      </div>
    </div>
  `)

  function setControls(values) {
    fields.forEach(field => {
      document.getElementById(
        `tactic-${field.key}`
      ).value = values[field.key]
    })
  }

  on('reset-tactics', () => setControls(defaults))

  on('save-tactics', () => {
    fields.forEach(field => {
      current[field.key] = document.getElementById(
        `tactic-${field.key}`
      ).value
    })

    tactics[team] = { ...current }
    showMatchupOverview()
  })

  on('tactics-back', showMatchupOverview)
}

// UNAVAILABLE ROSTER

function showUnavailable(team) {
  screen(`
    ${title(
      'QUICK GAME / TEAM MANAGEMENT',
      'ROSTER NOT AVAILABLE',
      'A complete roster is needed for this feature.'
    )}

    <div class="broadcast-panel lineup-empty">
      <h2>${escapeHTML(team.toUpperCase())}</h2>

      <p>
        This team needs at least five players.
        Kentucky and Florida are currently supported.
      </p>

      ${back('unavailable-back', 'MATCHUP')}
    </div>
  `)

  on('unavailable-back', showMatchupOverview)
}

// LIVE GAME SIMULATION

function showSimulationReady() {
  const { home, away } = matchup

  const game = createGame(
    {
      team: home,
      players: getPlayers(home),
      lineup: { ...ensureLineup(home) },
      rotation: [...ensureRotation(home)],
      tactics: { ...ensureTactics(home) }
    },
    {
      team: away,
      players: getPlayers(away),
      lineup: { ...ensureLineup(away) },
      rotation: [...ensureRotation(away)],
      tactics: { ...ensureTactics(away) }
    }
  )

  let timer = null
  let speed = 1
  let selectedBoxTeam = 'home'

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function periodLabel() {
    if (game.period === 1) return '1ST HALF'
    if (game.period === 2) return '2ND HALF'
    return game.period === 3
      ? 'OVERTIME'
      : `${game.period - 2}OT`
  }

  function renderBoxScore() {
    const team = game[selectedBoxTeam]
    const tbody = document.querySelector('#live-box-body')

    tbody.innerHTML = ''

    team.players.forEach(player => {
      const onCourt = team.onCourt.includes(player.index)
      const energy = Math.max(
        0,
        Math.round(100 - player.fatigue)
      )
      const minutes = (
        player.secondsPlayed / 60
      ).toFixed(1)

      const row = document.createElement('tr')

      if (onCourt) row.classList.add('box-on-court')

      const nameCell = document.createElement('td')
      nameCell.className = 'box-player-name'

      const indicator = document.createElement('span')
      indicator.className = onCourt
        ? 'box-court-indicator active'
        : 'box-court-indicator'

      const playerName = document.createElement('span')
      playerName.textContent =
        `#${player.number ?? '--'} ${player.name}`

      nameCell.append(indicator, playerName)
      row.appendChild(nameCell)

      const values = [
        minutes,
        player.stats.points,
        player.stats.rebounds,
        player.stats.assists,
        player.fouls
      ]

      values.forEach((value, index) => {
        const cell = document.createElement('td')
        cell.textContent = value

        if (index === 4 && player.fouls >= 4) {
          cell.classList.add('box-foul-warning')
        }

        row.appendChild(cell)
      })

      const energyCell = document.createElement('td')
      const energyWrap = document.createElement('div')
      energyWrap.className = 'box-energy'

      const energyTrack = document.createElement('div')
      energyTrack.className = 'box-energy-track'

      const energyFill = document.createElement('div')
      energyFill.className = 'box-energy-fill'

      if (energy < 40) {
        energyFill.classList.add('low')
      } else if (energy < 70) {
        energyFill.classList.add('medium')
      }

      energyFill.style.width = `${energy}%`
      energyTrack.appendChild(energyFill)

      const energyLabel = document.createElement('span')
      energyLabel.textContent = `${energy}%`

      energyWrap.append(energyTrack, energyLabel)
      energyCell.appendChild(energyWrap)
      row.appendChild(energyCell)

      tbody.appendChild(row)
    })
  }

  function render() {
    document.querySelector('#live-home-score').textContent =
      game.home.score

    document.querySelector('#live-away-score').textContent =
      game.away.score

    document.querySelector('#live-clock').textContent =
      formatClock(game.clock)

    document.querySelector('#live-period').textContent =
      periodLabel()

    document.querySelector('#live-possession').textContent =
      `${game[game.possession].name.toUpperCase()} BALL`

    document.querySelector('#home-fouls').textContent =
      game.home.teamFouls

    document.querySelector('#away-fouls').textContent =
      game.away.teamFouls

    document.querySelector('#live-possession-away')
      .classList.toggle(
        'has-possession',
        game.possession === 'away'
      )

    document.querySelector('#live-possession-home')
      .classList.toggle(
        'has-possession',
        game.possession === 'home'
      )

    document.querySelector('#box-team-home').classList.toggle(
      'selected',
      selectedBoxTeam === 'home'
    )

    document.querySelector('#box-team-away').classList.toggle(
      'selected',
      selectedBoxTeam === 'away'
    )

    const recentEvents = game.events.slice(-30).reverse()

    document.querySelector('#live-events').innerHTML =
      recentEvents.length
        ? recentEvents.map(event => `
            <div class="live-event">
              <span>
                ${event.period <= 2
                  ? `${event.period}H`
                  : `${event.period - 2}OT`}
                ${formatClock(event.clock)}
              </span>
              <p>${escapeHTML(event.text)}</p>
            </div>
          `).join('')
        : `
          <div class="live-event">
            <p>Both teams are ready for tipoff.</p>
          </div>
        `

    renderBoxScore()

    const playButton = document.querySelector('#game-play')
    playButton.textContent = timer ? 'PAUSE GAME' : 'PLAY GAME'

    if (game.finished) {
      stopTimer()

      playButton.disabled = true
      document.querySelector('#game-step').disabled = true
      document.querySelector('#game-sim-all').disabled = true

      document.querySelector('#game-finish').hidden = false
      document.querySelector('#live-status').textContent = 'FINAL'
      document.querySelector('#live-possession').textContent =
        'GAME COMPLETE'
    }
  }

  function step() {
    if (game.finished) return
    simulatePossession(game)
    render()
  }

  function play() {
    if (game.finished) return

    stopTimer()

    timer = setInterval(() => {
      for (
        let index = 0;
        index < speed && !game.finished;
        index++
      ) {
        simulatePossession(game)
      }

      render()
    }, 650)

    render()
  }

  function pause() {
    stopTimer()
    render()
  }

  screen(`
    ${title(
      'QUICK GAME / LIVE SIMULATION',
      'LIVE GAME',
      'SEC Basketball · College Basketball Manager'
    )}

    <div class="cbs-scoreboard">
      <div class="cbs-scoreboard-header">
        <div class="cbs-broadcast-brand">
          <span class="cbs-mini-orb"></span>
          <span>COLLEGE BASKETBALL MANAGER</span>
        </div>

        <div class="cbs-broadcast-status" id="live-status">
          LIVE
        </div>

        <span class="cbs-scoreboard-conference">
          SEC BASKETBALL
        </span>
      </div>

      <div class="cbs-scoreboard-main">
        <div class="cbs-team-block">
          <span class="cbs-team-type">AWAY TEAM</span>
          <div class="cbs-team-logo">SEC</div>
          <h2>${escapeHTML(away)}</h2>

          <div
            id="live-possession-away"
            class="cbs-possession-marker"
          >
            <span class="possession-dot"></span>
            POSSESSION
          </div>
        </div>

        <div class="cbs-team-score" id="live-away-score">
          0
        </div>

        <div class="cbs-clock-block">
          <div class="cbs-clock-heading">GAME CLOCK</div>
          <div id="live-clock" class="cbs-game-clock">
            20:00
          </div>
          <div id="live-period" class="cbs-period">
            1ST HALF
          </div>
          <div class="cbs-clock-divider"></div>
          <div id="live-possession" class="cbs-ball-label">
            TIPOFF
          </div>
        </div>

        <div class="cbs-team-score" id="live-home-score">
          0
        </div>

        <div class="cbs-team-block">
          <span class="cbs-team-type">HOME TEAM</span>
          <div class="cbs-team-logo">SEC</div>
          <h2>${escapeHTML(home)}</h2>

          <div
            id="live-possession-home"
            class="cbs-possession-marker"
          >
            <span class="possession-dot"></span>
            POSSESSION
          </div>
        </div>
      </div>

      <div class="cbs-scoreboard-footer">
        <div>
          <span>${escapeHTML(away.toUpperCase())} FOULS</span>
          <strong id="away-fouls">0</strong>
        </div>

        <div class="cbs-footer-center">
          NCAA MEN'S BASKETBALL
        </div>

        <div>
          <span>${escapeHTML(home.toUpperCase())} FOULS</span>
          <strong id="home-fouls">0</strong>
        </div>
      </div>
    </div>

    <div class="live-controls">
      <button
        id="game-play"
        class="live-control-primary"
      >
        PLAY GAME
      </button>

      <button id="game-step" class="live-control">
        NEXT POSSESSION
      </button>

      <label for="game-speed">SPEED</label>
      <select id="game-speed">
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="5">5×</option>
        <option value="10">10×</option>
      </select>

      <button id="game-sim-all" class="live-control">
        SIM TO FINAL
      </button>
    </div>

    <div class="live-game-panels">
      <section class="broadcast-panel live-box-panel">
        <div class="panel-heading">
          LIVE BOX SCORE
        </div>

        <div class="live-box-tabs">
          <button
            id="box-team-home"
            class="live-box-tab selected"
          >
            ${escapeHTML(home.toUpperCase())}
          </button>

          <button
            id="box-team-away"
            class="live-box-tab"
          >
            ${escapeHTML(away.toUpperCase())}
          </button>
        </div>

        <div class="live-box-table-wrap">
          <table class="live-box-table">
            <thead>
              <tr>
                <th>PLAYER</th>
                <th>MIN</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>PF</th>
                <th>ENG</th>
              </tr>
            </thead>
            <tbody id="live-box-body"></tbody>
          </table>
        </div>

        <div class="live-box-legend">
          <span class="box-court-indicator active"></span>
          ON COURT
          <span class="live-box-legend-separator">·</span>
          ENG = ENERGY
        </div>
      </section>

      <section class="broadcast-panel live-commentary">
        <div class="panel-heading">
          LIVE PLAY-BY-PLAY
        </div>

        <div id="live-events"></div>
      </section>
    </div>

    <div class="live-footer">
      <button
        id="game-finish"
        class="live-control-primary"
        hidden
      >
        VIEW FINAL BOX SCORE
      </button>

      ${back('leave-live-game', 'RETURN TO MATCHUP')}
    </div>
  `)

  on('box-team-home', () => {
    selectedBoxTeam = 'home'
    render()
  })

  on('box-team-away', () => {
    selectedBoxTeam = 'away'
    render()
  })

  on('game-play', () => {
    if (timer) pause()
    else play()
  })

  on('game-step', () => {
    pause()
    step()
  })

  document.querySelector('#game-speed').onchange = event => {
    speed = Number(event.target.value)
  }

  on('game-sim-all', () => {
    stopTimer()
    simulateGame(game)
    render()
  })

  on('game-finish', () => {
    stopTimer()
    showFinalBoxScore(getGameResult(game))
  })

  on('leave-live-game', () => {
    stopTimer()
    showMatchupOverview()
  })

  render()
}

// FINAL BOX SCORE

function showFinalBoxScore(result) {
  function makePlayerTable(team) {
    return `
      <div class="broadcast-panel boxscore-panel">
        <div class="panel-heading">
          ${escapeHTML(team.name.toUpperCase())}
          BOX SCORE
        </div>

        <div class="boxscore-scroll">
          <table class="roster-table">
            <thead>
              <tr>
                <th>PLAYER</th>
                <th>MIN</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>FG</th>
                <th>3PT</th>
                <th>FT</th>
                <th>STL</th>
                <th>TO</th>
                <th>PF</th>
              </tr>
            </thead>

            <tbody>
              ${team.players.map(player => `
                <tr>
                  <td>${escapeHTML(player.name)}</td>
                  <td>${player.minutes}</td>
                  <td>${player.points}</td>
                  <td>${player.rebounds}</td>
                  <td>${player.assists}</td>
                  <td>${player.fgm}-${player.fga}</td>
                  <td>${player.threePM}-${player.threePA}</td>
                  <td>${player.ftm}-${player.fta}</td>
                  <td>${player.steals}</td>
                  <td>${player.turnovers}</td>
                  <td>${player.fouls}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }

  screen(`
    ${title(
      'QUICK GAME / FINAL',
      'FINAL BOX SCORE',
      'Complete game results and individual player statistics.'
    )}

    <div class="final-result">
      <div>
        <span>AWAY</span>
        <h2>${escapeHTML(result.away.name)}</h2>
        <strong>${result.away.score}</strong>
      </div>

      <div class="final-result-center">
        <strong>FINAL</strong>

        ${result.overtime
          ? `<span>${result.overtime} OVERTIME PERIOD(S)</span>`
          : '<span>REGULATION</span>'}
      </div>

      <div>
        <span>HOME</span>
        <h2>${escapeHTML(result.home.name)}</h2>
        <strong>${result.home.score}</strong>
      </div>
    </div>

    <div class="final-winner">
      WINNER: ${escapeHTML(result.winner.toUpperCase())}
    </div>

    ${makePlayerTable(result.away)}
    ${makePlayerTable(result.home)}

    <div class="center-navigation">
      ${button(
        'boxscore-back',
        'RETURN TO MATCHUP',
        true
      )}
    </div>
  `)

  on('boxscore-back', showMatchupOverview)
}

showMainMenu()
