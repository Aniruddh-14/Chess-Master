"use client"

import { useState, useEffect } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Zap, BookOpen, Target, MessageSquare, RefreshCw, Info } from "lucide-react"
import ChessAnalysis from "@/components/chess-analysis"
import MoveHistory from "@/components/move-history"
import ChatMessage from "@/components/chat-message"
import EvaluationBar from "@/components/evaluation-bar"
import { getChessResponse } from "./actions/gemini-actions"

export default function ChessMaster() {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(game.fen())
  const [orientation, setOrientation] = useState("white")
  const [userMessage, setUserMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: "I'm ChessMaster, powered by Gemini AI. Ready to crush some chess? Let's see what you've got.",
    },
  ])
  const [currentTab, setCurrentTab] = useState("analysis")
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [gameState, setGameState] = useState({
    material: { white: 0, black: 0 },
    advantage: 0,
    advantageType: "equal" as "white" | "black" | "equal",
  })

  useEffect(() => {
    // Simple material evaluation (pawn=1, knight/bishop=3, rook=5, queen=9)
    const pieces = game.board().flat().filter(Boolean)
    let whiteMaterial = 0
    let blackMaterial = 0

    pieces.forEach((piece) => {
      const value =
        piece.type === "p"
          ? 1
          : piece.type === "n" || piece.type === "b"
            ? 3
            : piece.type === "r"
              ? 5
              : piece.type === "q"
                ? 9
                : 0

      if (piece.color === "w") {
        whiteMaterial += value
      } else {
        blackMaterial += value
      }
    })

    // Even simpler advantage calculation (white - black)
    const advantage = whiteMaterial - blackMaterial

    // Determine advantage type
    let advantageType = "equal"
    if (advantage > 1) advantageType = "white"
    if (advantage < -1) advantageType = "black"

    setGameState({
      material: { white: whiteMaterial, black: blackMaterial },
      advantage: advantage,
      advantageType: advantageType,
    })
  }, [fen])

  function makeAMove(move: any) {
    try {
      const result = game.move(move)
      if (result) {
        setFen(game.fen())
        const pgn = game.history({ verbose: true })
        const lastMove = pgn[pgn.length - 1]
        const moveNotation = `${lastMove.color === "w" ? "White" : "Black"}: ${lastMove.san}`
        setMoveHistory([...moveHistory, moveNotation])
        return true
      }
    } catch (error) {
      return false
    }
    return false
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to queen for simplicity
    })

    if (move) {
      // If the move is valid, simulate a computer response
      setTimeout(() => {
        const possibleMoves = game.moves()
        if (possibleMoves.length > 0 && !game.isGameOver()) {
          // Choose a random move
          const randomIndex = Math.floor(Math.random() * possibleMoves.length)
          makeAMove(possibleMoves[randomIndex])
        }
      }, 300)
      return true
    }
    return false
  }

  function resetGame() {
    const newGame = new Chess()
    setGame(newGame)
    setFen(newGame.fen())
    setMoveHistory([])
    setChatHistory([
      ...chatHistory,
      { role: "assistant", content: "Board reset. Ready for a fresh battle? Bring it on!" },
    ])
  }

  function flipBoard() {
    setOrientation(orientation === "white" ? "black" : "white")
    setChatHistory([
      ...chatHistory,
      {
        role: "assistant",
        content:
          orientation === "white"
            ? "Now you're playing as Black. The dark side has cookies, they say."
            : "Back to White. The first-move advantage is yours again.",
      },
    ])
  }

  async function handleSendMessage() {
    if (!userMessage.trim()) return

    // Add user message to chat
    setChatHistory([...chatHistory, { role: "user", content: userMessage }])

    // Add a loading message
    setChatHistory((prev) => [...prev, { role: "assistant", content: "Thinking..." }])

    try {
      // Call the Gemini API with the current game state
      const response = await getChessResponse(userMessage, game.fen(), {
        isCheck: game.isCheck(),
        isCheckmate: game.isCheckmate(),
        isDraw: game.isDraw(),
        isStalemate: game.isStalemate(),
        turn: game.turn() === "w" ? "white" : "black",
        material: {
          white: gameState.material.white,
          black: gameState.material.black,
        },
        advantage: gameState.advantageType,
      })

      // Remove the loading message and add the actual response
      setChatHistory((prev) => [...prev.slice(0, prev.length - 1), { role: "assistant", content: response.message }])
    } catch (error) {
      // If there's an error, replace the loading message with an error message
      setChatHistory((prev) => [
        ...prev.slice(0, prev.length - 1),
        {
          role: "assistant",
          content: "My chess engine crashed. Even grandmasters make mistakes sometimes. Try again?",
        },
      ])
    }

    setUserMessage("")
  }

  async function getSuggestion() {
    try {
      // Add a loading message
      setChatHistory([...chatHistory, { role: "assistant", content: "Analyzing position..." }])

      // Call the Gemini API asking for a suggestion
      const response = await getChessResponse(
        "Give me a suggestion for my next move based on the current position.",
        game.fen(),
        {
          isCheck: game.isCheck(),
          isCheckmate: game.isCheckmate(),
          isDraw: game.isDraw(),
          isStalemate: game.isStalemate(),
          turn: game.turn() === "w" ? "white" : "black",
          material: {
            white: gameState.material.white,
            black: gameState.material.black,
          },
          advantage: gameState.advantageType,
        },
      )

      // Remove the loading message and add the actual response
      setChatHistory((prev) => [...prev.slice(0, prev.length - 1), { role: "assistant", content: response.message }])
    } catch (error) {
      // If there's an error, replace the loading message with an error message
      setChatHistory((prev) => [
        ...prev.slice(0, prev.length - 1),
        {
          role: "assistant",
          content:
            "My strategic circuits are overloaded. Even I need a break from your questionable moves. Try again in a moment.",
        },
      ])
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-gray-900 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold">ChessMaster</h1>
            <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-500">
              Savage Mode
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={flipBoard}>
              Flip Board
            </Button>
            <Button variant="destructive" size="sm" onClick={resetGame}>
              <RefreshCw className="mr-1 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
        <div className="container mx-auto mt-1">
          <p className="text-xs text-gray-500 text-right">Copyright © Aniruddh Sharma</p>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card className="overflow-hidden border-gray-800 bg-gray-900 p-4">
              <div className="aspect-square w-full max-w-[600px] mx-auto">
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  boardOrientation={orientation}
                  customDarkSquareStyle={{ backgroundColor: "#1e293b" }}
                  customLightSquareStyle={{ backgroundColor: "#334155" }}
                  customBoardStyle={{
                    borderRadius: "4px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={getSuggestion} className="bg-indigo-600 hover:bg-indigo-700">
                  <Target className="mr-2 h-4 w-4" /> Get Suggestion
                </Button>
                <Button variant="outline" onClick={() => setCurrentTab("openings")}>
                  <BookOpen className="mr-2 h-4 w-4" /> Openings
                </Button>
                <Button variant="outline" onClick={() => setCurrentTab("chat")}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Chat
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="openings">Openings</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="border-none p-0">
                <Card className="border-gray-800 bg-gray-900">
                  <div className="p-4">
                    <h3 className="mb-2 text-lg font-semibold">Position Evaluation</h3>
                    <EvaluationBar
                      advantage={gameState.advantage}
                      whiteScore={gameState.material.white}
                      blackScore={gameState.material.black}
                    />

                    <h3 className="mb-2 text-lg font-semibold">Game Analysis</h3>
                    <ChessAnalysis game={game} />

                    <h3 className="mb-2 mt-4 text-lg font-semibold">Move History</h3>
                    <MoveHistory moves={moveHistory} />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="openings" className="border-none p-0">
                <Card className="border-gray-800 bg-gray-900">
                  <div className="p-4">
                    <h3 className="mb-2 text-lg font-semibold">Popular Openings</h3>
                    <ul className="space-y-2">
                      <li className="rounded bg-gray-800 p-2">
                        <h4 className="font-medium text-yellow-500">Sicilian Defense</h4>
                        <p className="text-sm text-gray-300">
                          1. e4 c5 - Sharp, asymmetrical opening that gives Black good counterplay
                        </p>
                      </li>
                      <li className="rounded bg-gray-800 p-2">
                        <h4 className="font-medium text-yellow-500">Queen's Gambit</h4>
                        <p className="text-sm text-gray-300">
                          1. d4 d5 2. c4 - White offers a pawn to gain central control
                        </p>
                      </li>
                      <li className="rounded bg-gray-800 p-2">
                        <h4 className="font-medium text-yellow-500">Ruy Lopez</h4>
                        <p className="text-sm text-gray-300">
                          1. e4 e5 2. Nf3 Nc6 3. Bb5 - One of the oldest and most respected openings
                        </p>
                      </li>
                      <li className="rounded bg-gray-800 p-2">
                        <h4 className="font-medium text-yellow-500">French Defense</h4>
                        <p className="text-sm text-gray-300">
                          1. e4 e6 - Solid choice for Black leading to closed positions
                        </p>
                      </li>
                      <li className="rounded bg-gray-800 p-2">
                        <h4 className="font-medium text-yellow-500">King's Indian Defense</h4>
                        <p className="text-sm text-gray-300">
                          1. d4 Nf6 2. c4 g6 - Hypermodern opening allowing White center control initially
                        </p>
                      </li>
                    </ul>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="border-none p-0">
                <Card className="border-gray-800 bg-gray-900">
                  <div className="flex h-[500px] flex-col">
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-4">
                        {chatHistory.map((message, index) => (
                          <ChatMessage key={index} role={message.role} content={message.content} />
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-gray-800 p-4">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Ask for advice or trash talk the AI..."
                          value={userMessage}
                          onChange={(e) => setUserMessage(e.target.value)}
                          className="min-h-[60px] flex-1 bg-gray-800 border-gray-700"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <Button onClick={handleSendMessage} className="bg-yellow-600 hover:bg-yellow-700">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        <footer className="mt-8 border-t border-gray-800 pt-4 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Aniruddh Sharma. All rights reserved.</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Info className="h-4 w-4" />
            <span>Powered by Gemini AI and chess.js</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

