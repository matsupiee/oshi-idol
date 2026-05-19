const K = 32;

export function calculateExpected(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function calculateNewRating(
  currentRating: number,
  actual: 0 | 1,
  opponentRating: number,
): number {
  const expected = calculateExpected(currentRating, opponentRating);
  return Math.round(currentRating + K * (actual - expected));
}

export function calculateBattleResult(
  winnerRating: number,
  loserRating: number,
): { newWinnerRating: number; newLoserRating: number } {
  return {
    newWinnerRating: calculateNewRating(winnerRating, 1, loserRating),
    newLoserRating: calculateNewRating(loserRating, 0, winnerRating),
  };
}
