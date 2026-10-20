
const positionWeights = {
  PG: {
    shooting: 0.20,
    finishing: 0.15,
    passing: 0.30,
    defense: 0.15,
    rebounding: 0.05,
    stamina: 0.15
  },

  SG: {
    shooting: 0.30,
    finishing: 0.20,
    passing: 0.10,
    defense: 0.20,
    rebounding: 0.05,
    stamina: 0.15
  },

  SF: {
    shooting: 0.20,
    finishing: 0.20,
    passing: 0.10,
    defense: 0.20,
    rebounding: 0.15,
    stamina: 0.15
  },

  PF: {
    shooting: 0.10,
    finishing: 0.25,
    passing: 0.05,
    defense: 0.25,
    rebounding: 0.25,
    stamina: 0.10
  },

  C: {
    shooting: 0.05,
    finishing: 0.25,
    passing: 0.05,
    defense: 0.25,
    rebounding: 0.30,
    stamina: 0.10
  }
}

export function calculateOverall(player, position = player.position) {
  const weights = positionWeights[position] || positionWeights.SF

  let overall = 0

  for (const attribute in weights) {
    const rating = Number(player[attribute]) || 0
    overall += rating * weights[attribute]
  }

  return Math.max(0, Math.min(99, Math.round(overall)))
}
