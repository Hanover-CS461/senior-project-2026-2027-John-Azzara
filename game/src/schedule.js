
const SEC_TEAMS = [
  'Alabama',
  'Arkansas',
  'Auburn',
  'Florida',
  'Georgia',
  'Kentucky',
  'LSU',
  'Mississippi State',
  'Missouri',
  'Ole Miss',
  'Oklahoma',
  'South Carolina',
  'Tennessee',
  'Texas',
  'Texas A&M',
  'Vanderbilt'
]

export function generateSECSchedule(season = 2026) {
  const teams = [...SEC_TEAMS]
  const rounds = []

  // Circle method: 15 rounds, every team plays
  // each of the other 15 teams exactly once.
  let rotation = [...teams]

  for (let round = 0; round < 15; round++) {
    const matchups = []

    for (let i = 0; i < 8; i++) {
      matchups.push({
        teamA: rotation[i],
        teamB: rotation[15 - i]
      })
    }

    rounds.push(matchups)

    // Keep the first team fixed and rotate the rest.
    rotation = [
      rotation[0],
      rotation[15],
      ...rotation.slice(1, 15)
    ]
  }

  // Three additional rounds provide 3 repeat
  // opponents per team, for 18 games total.
  for (let round = 0; round < 3; round++) {
    rounds.push(
      rounds[round].map(matchup => ({ ...matchup }))
    )
  }

  // Balance home and away games using an
  // Eulerian orientation of the matchup graph.
  // Every team has 18 matchups, so each will
  // host exactly 9 and travel for exactly 9.
  const allMatchups = []
  const adjacency = new Map(
    teams.map(team => [team, []])
  )

  rounds.forEach((round, roundIndex) => {
    round.forEach(matchup => {
      const id = allMatchups.length

      allMatchups.push({
        id,
        round: roundIndex + 1,
        teamA: matchup.teamA,
        teamB: matchup.teamB,
        home: null,
        away: null
      })

      adjacency.get(matchup.teamA).push(id)
      adjacency.get(matchup.teamB).push(id)
    })
  })

  const used = new Set()
  const positions = new Map(
    teams.map(team => [team, 0])
  )

  for (const startingTeam of teams) {
    const stack = [startingTeam]

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const edges = adjacency.get(current)

      let position = positions.get(current)

      while (
        position < edges.length &&
        used.has(edges[position])
      ) {
        position++
      }

      positions.set(current, position)

      if (position >= edges.length) {
        stack.pop()
        continue
      }

      const edgeId = edges[position]
      positions.set(current, position + 1)

      if (used.has(edgeId)) continue

      used.add(edgeId)

      const game = allMatchups[edgeId]
      const opponent =
        game.teamA === current
          ? game.teamB
          : game.teamA

      game.home = current
      game.away = opponent

      stack.push(opponent)
    }
  }

  // Reverse all venues in alternating seasons.
  if (season % 2 !== 0) {
    allMatchups.forEach(game => {
      const oldHome = game.home
      game.home = game.away
      game.away = oldHome
    })
  }

  // Return games in round order.
  return allMatchups
    .sort((a, b) => a.round - b.round || a.id - b.id)
    .map((game, index) => ({
      id: index + 1,
      season,
      round: game.round,
      type: 'conference',
      home: game.home,
      away: game.away,
      played: false,
      homeScore: null,
      awayScore: null
    }))
}

// Get one team's complete SEC schedule.
export function getTeamSchedule(games, team) {
  return games.filter(game =>
    game.home === team || game.away === team
  )
}

// Get all games in a particular round.
export function getRoundGames(games, round) {
  return games.filter(game => game.round === round)
}

// Get the next unplayed game for a team.
export function getNextGame(games, team) {
  return games.find(game =>
    !game.played &&
    (game.home === team || game.away === team)
  ) || null
}
