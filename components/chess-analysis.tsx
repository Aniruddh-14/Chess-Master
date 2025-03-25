"use client"

import { useState, useEffect } from "react"
import type { Chess } from "chess.js"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Check, Crown } from "lucide-react"

interface ChessAnalysisProps {
  game: Chess
}

export default function ChessAnalysis({ game }: ChessAnalysisProps) {
  const [gameState, setGameState] = useState({
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    isStalemate: false,
    turn: "white",
    material: { white: 0, black: 0 },
    advantage: "equal" as "white" | "black" | "equal",
  })

  useEffect(() => {
    // Calculate material advantage
    const fen = game.fen()
    const pieces = fen.split(" ")[0]

    let whiteMaterial = 0
    let blackMaterial = 0

    // Piece values: pawn=1, knight/bishop=3, rook=5, queen=9, king=0 (not counted for material)
    for (const char of pieces) {
      if (char === "P") whiteMaterial += 1
      if (char === "N" || char === "B") whiteMaterial += 3
      if (char === "R") whiteMaterial += 5
      if (char === "Q") whiteMaterial += 9

      if (char === "p") blackMaterial += 1
      if (char === "n" || char === "b") blackMaterial += 3
      if (char === "r") blackMaterial += 5
      if (char === "q") blackMaterial += 9
    }

    // Determine advantage based on material difference
    let advantage = "equal"
    const materialDifference = whiteMaterial - blackMaterial

    if (materialDifference >= 1.5) advantage = "white"
    if (materialDifference <= -1.5) advantage = "black"

    // Additional factors for advantage calculation
    // Check gives a slight advantage
    if (game.isCheck() && game.turn() === "b") {
      // White has check against black
      if (advantage === "equal") advantage = "white"
    } else if (game.isCheck() && game.turn() === "w") {
      // Black has check against white
      if (advantage === "equal") advantage = "black"
    }

    // Game over states
    if (game.isCheckmate()) {
      advantage = game.turn() === "b" ? "white" : "black"
    }

    setGameState({
      isCheck: game.isCheck(),
      isCheckmate: game.isCheckmate(),
      isDraw: game.isDraw(),
      isStalemate: game.isStalemate(),
      turn: game.turn() === "w" ? "white" : "black",
      material: { white: whiteMaterial, black: blackMaterial },
      advantage,
    })
  }, [game])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gameState.isCheck && (
          <Badge variant="outline" className="bg-red-500/10 text-red-500">
            <AlertTriangle className="mr-1 h-4 w-4" /> Check
          </Badge>
        )}

        {gameState.isCheckmate && (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
            <Crown className="mr-1 h-4 w-4" /> Checkmate
          </Badge>
        )}

        {gameState.isDraw && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
            Draw
          </Badge>
        )}

        {gameState.isStalemate && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
            Stalemate
          </Badge>
        )}

        <Badge
          variant="outline"
          className={
            gameState.turn === "white" ? "bg-gray-200/10 text-gray-200" : "bg-gray-800/80 text-gray-300 border-gray-700"
          }
        >
          {gameState.turn === "white" ? "White to move" : "Black to move"}
        </Badge>
      </div>

      <div className="rounded bg-gray-800 p-3">
        <h4 className="mb-2 font-medium">Material Balance</h4>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-300">White: </span>
            <span className="font-mono">{gameState.material.white}</span>
          </div>
          <div>
            <span className="text-gray-300">Black: </span>
            <span className="font-mono">{gameState.material.black}</span>
          </div>
          <div>
            {gameState.advantage === "equal" && <Badge className="bg-blue-500/10 text-blue-500">Equal</Badge>}
            {gameState.advantage === "white" && (
              <Badge className="bg-gray-200/10 text-gray-200">
                <Check className="mr-1 h-3 w-3" /> White Advantage
              </Badge>
            )}
            {gameState.advantage === "black" && (
              <Badge className="bg-gray-800 text-gray-300 border-gray-700">
                <Check className="mr-1 h-3 w-3" /> Black Advantage
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="rounded bg-gray-800 p-3">
        <h4 className="mb-2 font-medium">Position Evaluation</h4>
        <p className="text-sm text-gray-300">
          {gameState.isCheckmate && "Checkmate! Game over."}
          {gameState.isDraw && "The game is a draw."}
          {gameState.isStalemate && "Stalemate! The game is a draw."}
          {!gameState.isCheckmate &&
            !gameState.isDraw &&
            !gameState.isStalemate &&
            (gameState.advantage === "equal"
              ? "The position is roughly equal. Both sides have chances."
              : `${gameState.advantage === "white" ? "White" : "Black"} has a material advantage and better winning chances.`)}
        </p>
      </div>
    </div>
  )
}

