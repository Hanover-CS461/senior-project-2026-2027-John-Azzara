
import { calculateOverall } from './ratings.js'

const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, value))

const random = () => Math.random()

function chance(probability) {
  return random() < clamp(probability, 0, 1)
}

function chooseWeighted(items, weightFunction) {
  if (!items.length) return null

  const weights = items.map(item =>
    Math.max(0.01, weightFunction(item))
  )

  const total = weights.reduce((sum, value) => sum + value, 0)
  let roll = random() * total

  for (let index = 0; index < items.length; index++) {
    roll -= weights[index]
    if (roll <= 0) return items[index]
  }

  return items[items.length - 1]
}

function makeTeam(config) {
  const players = config.players.map((player, index) => ({
    ...player,
    index,
    fatigue: 0,
    fouls: 0,
    secondsPlayed: 0,
    stats: {
      points: 0,
      fgm: 0,
      fga: 0,
      threePM: 0,
      threePA: 0,
      ftm: 0,
      fta: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0
    }
  }))

  const starters = Object.values(config.lineup)

  return {
    name: config.team,
    players,
    lineup: { ...config.lineup },
    rotation: [...config.rotation],
    tactics: { ...config.tactics },
    onCourt: [...starters],
    score: 0,
    teamFouls: 0,
    stats: {
      turnovers: 0,
      offensiveRebounds: 0
    }
  }
}

export function createGame(homeConfig, awayConfig) {
  return {
    home: makeTeam(homeConfig),
    away: makeTeam(awayConfig),
    period: 1,
    clock: 1200,
    possession: chance(0.5) ? 'home' : 'away',
    events: [],
    finished: false,
    totalPossessions: 0,
    overtimeCount: 0
  }
}

function log(game, description) {
  const event = {
    period: game.period,
    clock: game.clock,
    text: description
  }

  game.events.push(event)
  return event
}

function getOnCourt(team) {
  return team.onCourt.map(index => team.players[index])
}

function attribute(player, name) {
  const fatiguePenalty = player.fatigue * 0.20

  return clamp(
    (Number(player[name]) || 50) - fatiguePenalty,
    15,
    99
  )
}

function averageAttribute(players, name) {
  if (!players.length) return 50

  return players.reduce(
    (sum, player) => sum + attribute(player, name),
    0
  ) / players.length
}

function updatePlayingTime(game, elapsed) {
  for (const team of [game.home, game.away]) {
    for (const player of getOnCourt(team)) {
      player.secondsPlayed += elapsed

      const stamina = Number(player.stamina) || 50
      const rate = (105 - stamina) / 65

      player.fatigue = clamp(
        player.fatigue + elapsed * rate * 0.025,
        0,
        100
      )
    }

    for (const player of team.players) {
      if (!team.onCourt.includes(player.index)) {
        player.fatigue = Math.max(
          0,
          player.fatigue - elapsed * 0.018
        )
      }
    }
  }
}

function substitutionCheck(team, game) {
  const periodLength = game.period <= 2 ? 1200 : 300

  const elapsedGameSeconds =
    game.period <= 2
      ? (game.period - 1) * 1200 + (1200 - game.clock)
      : 2400 + (game.period - 3) * 300 + (300 - game.clock)

  const progress = clamp(elapsedGameSeconds / 2400, 0, 1)

  const style = team.tactics.substitutions

  const fatigueThreshold =
    style === 'Frequent' ? 30 :
    style === 'Conservative' ? 65 : 45

  const available = team.players.filter(player =>
    !team.onCourt.includes(player.index) &&
    player.fouls < 5
  )

  if (!available.length) return

  const current = getOnCourt(team)

  const candidates = current.filter(player => {
    const targetSeconds =
      (team.rotation[player.index] || 0) * 60

    const overTarget =
      player.secondsPlayed > targetSeconds * progress + 120

    return player.fatigue > fatigueThreshold ||
      overTarget ||
      player.fouls >= 5
  })

  if (!candidates.length) return

  const outgoing = candidates.sort(
    (a, b) => b.fatigue - a.fatigue
  )[0]

  const incoming = chooseWeighted(available, player => {
    const target = (team.rotation[player.index] || 0) * 60
    const remaining = Math.max(0, target - player.secondsPlayed)

    return remaining + 1
  })

  if (!incoming) return

  const slot = team.onCourt.indexOf(outgoing.index)
  team.onCourt[slot] = incoming.index

  log(
    game,
    `${team.name} substitution: ${incoming.name} replaces ${outgoing.name}.`
  )
}

function awardRebound(game, offense, defense, shooter) {
  const offensivePlayers = getOnCourt(offense)
  const defensivePlayers = getOnCourt(defense)

  const offenseRating = averageAttribute(
    offensivePlayers,
    'rebounding'
  )

  const defenseRating = averageAttribute(
    defensivePlayers,
    'rebounding'
  )

  const offensiveReboundProbability = clamp(
    0.27 + (offenseRating - defenseRating) * 0.003,
    0.14,
    0.40
  )

  const offensive = chance(offensiveReboundProbability)
  const team = offensive ? offense : defense

  const rebounder = chooseWeighted(
    getOnCourt(team),
    player => attribute(player, 'rebounding')
  )

  rebounder.stats.rebounds++

  if (offensive) {
    offense.stats.offensiveRebounds++
  }

  log(
    game,
    `${rebounder.name} grabs the ${offensive ? 'offensive' : 'defensive'} rebound.`
  )

  return offensive
}

function attemptFreeThrows(game, offense, shooter, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    shooter.stats.fta++

    const probability = clamp(
      0.55 + (attribute(shooter, 'shooting') - 50) * 0.004,
      0.50,
      0.90
    )

    if (chance(probability)) {
      shooter.stats.ftm++
      shooter.stats.points++
      offense.score++

      log(game, `${shooter.name} makes a free throw.`)
    } else {
      log(game, `${shooter.name} misses a free throw.`)
    }
  }
}

function attemptShot(game, offense, defense) {
  const attackers = getOnCourt(offense)
  const defenders = getOnCourt(defense)

  const shooter = chooseWeighted(attackers, player =>
    attribute(player, 'shooting') +
    attribute(player, 'finishing') * 0.8
  )

  const outside = offense.tactics.offense === 'Outside'
  const inside = offense.tactics.offense === 'Inside'

  const threeProbability = outside ? 0.55 :
    inside ? 0.22 : 0.38

  const threePoint = chance(threeProbability)
  const shootingAttribute = threePoint ? 'shooting' : 'finishing'

  const shotRating = attribute(shooter, shootingAttribute)
  const defenseRating = averageAttribute(defenders, 'defense')

  const zone = defense.tactics.defense === '2-3 Zone'
  const press = defense.tactics.defense === 'Full-Court Press'

  let probability = threePoint ? 0.34 : 0.49

  probability += (shotRating - 70) * 0.003
  probability -= (defenseRating - 70) * 0.002

  if (zone) probability += threePoint ? 0.035 : -0.035
  if (press) probability += 0.025

  probability = clamp(
    probability,
    threePoint ? 0.18 : 0.28,
    threePoint ? 0.53 : 0.72
  )

  const foulProbability = threePoint ? 0.045 : 0.105

  if (chance(foulProbability)) {
    const defender = chooseWeighted(
      defenders,
      player => 110 - attribute(player, 'defense')
    )

    defender.fouls++
    defense.teamFouls++

    log(game, `${defender.name} fouls ${shooter.name} on a shot.`)

    attemptFreeThrows(
      game,
      offense,
      shooter,
      threePoint ? 3 : 2
    )

    return false
  }

  shooter.stats.fga++
  if (threePoint) shooter.stats.threePA++

  const points = threePoint ? 3 : 2

  if (chance(probability)) {
    shooter.stats.fgm++
    shooter.stats.points += points
    offense.score += points

    if (threePoint) shooter.stats.threePM++

    log(
      game,
      `${shooter.name} makes a ${threePoint ? 'three-pointer' : 'two-point basket'}!`
    )

    if (chance(0.53)) {
      const passer = chooseWeighted(
        attackers.filter(player => player.index !== shooter.index),
        player => attribute(player, 'passing')
      )

      if (passer) {
        passer.stats.assists++
        log(game, `Assist by ${passer.name}.`)
      }
    }

    return false
  }

  log(
    game,
    `${shooter.name} misses a ${threePoint ? 'three-pointer' : 'shot'}.`
  )

  return awardRebound(game, offense, defense, shooter)
}

function resolvePossession(game) {
  const offenseKey = game.possession
  const defenseKey = offenseKey === 'home' ? 'away' : 'home'

  const offense = game[offenseKey]
  const defense = game[defenseKey]

  const offensePlayers = getOnCourt(offense)
  const defensePlayers = getOnCourt(defense)

  const passing = averageAttribute(offensePlayers, 'passing')
  const defenseRating = averageAttribute(defensePlayers, 'defense')

  let turnoverProbability =
    0.12 - (passing - 70) * 0.0015 +
    (defenseRating - 70) * 0.001

  if (defense.tactics.defense === 'Full-Court Press') {
    turnoverProbability += 0.055
  }

  turnoverProbability = clamp(
    turnoverProbability,
    0.06,
    0.24
  )

  if (chance(turnoverProbability)) {
    const player = chooseWeighted(
      offensePlayers,
      player => 110 - attribute(player, 'passing')
    )

    player.stats.turnovers++
    offense.stats.turnovers++

    log(game, `${player.name} turns the ball over.`)

    if (chance(0.55)) {
      const defender = chooseWeighted(
        defensePlayers,
        player => attribute(player, 'defense')
      )

      defender.stats.steals++
      log(game, `${defender.name} records the steal.`)
    }

    return false
  }

  return attemptShot(game, offense, defense)
}

function possessionSeconds(game) {
  const offense = game[game.possession]

  const pace = offense.tactics.pace

  const base = pace === 'Fast' ? 12 :
    pace === 'Slow' ? 23 : 17

  return Math.round(
    clamp(base + (random() - 0.5) * 10, 5, 29)
  )
}

export function simulatePossession(game) {
  if (game.finished) return game

  const elapsed = Math.min(
    possessionSeconds(game),
    game.clock
  )

  updatePlayingTime(game, elapsed)

  game.clock -= elapsed
  game.totalPossessions++

  const offensiveRebound = resolvePossession(game)

  if (!offensiveRebound) {
    game.possession =
      game.possession === 'home' ? 'away' : 'home'
  }

  substitutionCheck(game.home, game)
  substitutionCheck(game.away, game)

  if (game.clock <= 0) {
    if (game.period === 1) {
      log(game, 'HALFTIME')
      game.period = 2
      game.clock = 1200
      game.home.teamFouls = 0
      game.away.teamFouls = 0
      game.possession =
        game.possession === 'home' ? 'away' : 'home'
    } else if (game.home.score === game.away.score) {
      game.period++
      game.overtimeCount++
      game.clock = 300
      game.home.teamFouls = 0
      game.away.teamFouls = 0
      log(game, 'OVERTIME BEGINS')
    } else {
      game.finished = true
      log(
        game,
        `FINAL: ${game.away.name} ${game.away.score}, ${game.home.name} ${game.home.score}`
      )
    }
  }

  return game
}

export function simulateGame(game) {
  while (!game.finished) {
    simulatePossession(game)
  }

  return getGameResult(game)
}

export function getGameResult(game) {
  function teamResult(team) {
    return {
      name: team.name,
      score: team.score,
      turnovers: team.stats.turnovers,
      offensiveRebounds: team.stats.offensiveRebounds,
      players: team.players.map(player => ({
        name: player.name,
        number: player.number,
        position: player.position,
        minutes: Math.round(player.secondsPlayed / 60),
        fouls: player.fouls,
        ...player.stats
      }))
    }
  }

  return {
    home: teamResult(game.home),
    away: teamResult(game.away),
    winner: game.home.score > game.away.score
      ? game.home.name
      : game.away.name,
    overtime: game.overtimeCount,
    possessions: game.totalPossessions,
    events: [...game.events]
  }
}

export function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
