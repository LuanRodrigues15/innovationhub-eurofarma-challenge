import type { HybridWeights } from '@/services/ideasService'

export function calculateHybridScore(
  aiScore: number,
  socialScore: number,
  weightAi: number = 0.7,
  weightSocial: number = 0.3
): number {
  return Math.round(aiScore * weightAi + socialScore * weightSocial)
}

export function calculateHybridScoreWithWeights(
  aiScore: number,
  socialScore: number,
  weights: HybridWeights
): number {
  return calculateHybridScore(aiScore, socialScore, weights.ai, weights.social)
}

// Penalidade de rejeição aplicada somente na ordenação por relevância (score).
// Máx 50% de penalidade; nunca zera o score.
export function applyRejectionPenalty(score: number, rejectionCount: number): number {
  const penalty = Math.min(rejectionCount * 0.05, 0.5)
  return score * (1 - penalty)
}

export function calculateTimeDecay(hybridScore: number, ageHours: number, gravity: number = 1.8): number {
  return hybridScore / Math.pow(ageHours + 2, gravity)
}
