interface EvaluationBarProps {
  advantage: string | number
  whiteScore?: number
  blackScore?: number
}

export default function EvaluationBar({ advantage, whiteScore = 0, blackScore = 0 }: EvaluationBarProps) {
  // Calculate the evaluation percentage (0-100)
  // 50 means equal, >50 means white advantage, <50 means black advantage
  const calculateEvalPercentage = () => {
    // If advantage is a number, use it directly
    if (typeof advantage === "number") {
      const materialDiff = advantage

      // If the material difference is 0, return 50 (equal)
      if (materialDiff === 0) return 50

      // Calculate percentage based on material difference
      // Max out at ±10 pawns worth of material (±10 points)
      const maxDiff = 10
      const percentage = 50 + (materialDiff / maxDiff) * 50

      // Clamp between 5 and 95 to always show some bar
      return Math.min(Math.max(percentage, 5), 95)
    }

    // If advantage is a string, use the material scores
    const materialDiff = whiteScore - blackScore

    // If the material difference is 0, return 50 (equal)
    if (materialDiff === 0) return 50

    // Calculate percentage based on material difference
    // Max out at ±10 pawns worth of material (±10 points)
    const maxDiff = 10
    const percentage = 50 + (materialDiff / maxDiff) * 50

    // Clamp between 5 and 95 to always show some bar
    return Math.min(Math.max(percentage, 5), 95)
  }

  const evalPercentage = calculateEvalPercentage()

  // Determine advantage text
  const getAdvantageText = () => {
    if (typeof advantage === "string") {
      if (advantage === "equal") return "Equal position"
      if (advantage === "white") return `White advantage (+${(whiteScore - blackScore).toFixed(1)})`
      if (advantage === "black") return `Black advantage (+${(blackScore - whiteScore).toFixed(1)})`
      return "Equal position"
    }

    // If advantage is a number
    if (advantage === 0) return "Equal position"
    if (advantage > 0) return `White advantage (+${advantage.toFixed(1)})`
    return `Black advantage (+${Math.abs(advantage).toFixed(1)})`
  }

  return (
    <div className="mb-4 w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">Black</span>
        <span className="text-gray-400">White</span>
      </div>
      <div className="h-4 w-full bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500"
          style={{
            width: `${evalPercentage}%`,
            transition: "width 0.5s ease-in-out",
          }}
        />
      </div>
      <div className="mt-1 text-center text-xs text-gray-400">{getAdvantageText()}</div>
    </div>
  )
}

