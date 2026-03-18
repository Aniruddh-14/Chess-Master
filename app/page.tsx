"use client"

import { useState, useEffect, useRef } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "react-chessboard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Zap, BookOpen, Target, MessageSquare, RefreshCw, Info, Users, Plus, LogIn } from "lucide-react"
import ChessAnalysis from "@/components/chess-analysis"
import MoveHistory from "@/components/move-history"
import ChatMessage from "@/components/chat-message"
import EvaluationBar from "@/components/evaluation-bar"
import { getChessResponse } from "./actions/gemini-actions"
import { io, Socket } from "socket.io-client"

// Initialize socket outside component to prevent multiple connections
const socketURL = process.env.NODE_ENV === 'production' && typeof window !== 'undefined'
  ? window.location.origin 
  : 'http://localhost:3001';

export default function ChessMaster() {
  const [game, setGame] = useState(new Chess())
  const [fen, setFen] = useState(game.fen())
  const [orientation, setOrientation] = useState<"white" | "black">("white")
  const [userMessage, setUserMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([
    {
      role: "assistant",
      content: "I'm ChessMaster. Play against the AI, or invite a friend for multiplayer!",
    },
  ])
  const [currentTab, setCurrentTab] = useState("analysis")
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [gameState, setGameState] = useState({
    material: { white: 0, black: 0 },
    advantage: 0,
    advantageType: "equal" as "white" | "black" | "equal",
  })

  // Multiplayer State
  const [socket, setSocket] = useState<Socket | null>(null)
  const [inRoom, setInRoom] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [joinInput, setJoinInput] = useState("")
  const [opponentConnected, setOpponentConnected] = useState(false)
  const [isLobbyOpen, setIsLobbyOpen] = useState(false)

  useEffect(() => {
    // Connect socket
    const newSocket = io(socketURL)
    setSocket(newSocket)

    newSocket.on("connect", () => {
      console.log("Connected to server")
    })

    newSocket.on("opponent_joined", (data: any) => {
      setOpponentConnected(true)
      setChatHistory(prev => [...prev, { role: "assistant", content: "An opponent has joined the room!" }])
    })

    newSocket.on("opponent_disconnected", () => {
      setOpponentConnected(false)
      setChatHistory(prev => [...prev, { role: "assistant", content: "Your opponent disconnected." }])
    })

    return () => {
      newSocket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!socket) return;

    socket.on("move", (moveData: any) => {
      // make the move sent from opponent
      try {
        const result = game.move(moveData)
        if (result) {
          setFen(game.fen())
          const pgn = game.history({ verbose: true })
          const lastMove = pgn[pgn.length - 1]
          const moveNotation = `${lastMove.color === "w" ? "White" : "Black"}: ${lastMove.san}`
          setMoveHistory(prev => [...prev, moveNotation])
        }
      } catch(e) {
        console.error("Invalid move received:", e)
      }
    })

    socket.on("chat_message", (data: any) => {
      setChatHistory(prev => [...prev, { role: "user", content: `Opponent: ${data.message}` }])
    })

    return () => {
      socket.off("move")
      socket.off("chat_message")
    }
  }, [socket, game, inRoom])

  useEffect(() => {
    // Simple material evaluation
    const pieces = game.board().flat().filter(Boolean)
    let whiteMaterial = 0
    let blackMaterial = 0

    pieces.forEach((piece) => {
      if (!piece) return;
      const value =
        piece.type === "p" ? 1 :
        piece.type === "n" || piece.type === "b" ? 3 :
        piece.type === "r" ? 5 :
        piece.type === "q" ? 9 : 0

      if (piece.color === "w") whiteMaterial += value
      else blackMaterial += value
    })

    const advantage = whiteMaterial - blackMaterial
    let advantageType: "white" | "black" | "equal" = "equal"
    if (advantage > 1) advantageType = "white"
    if (advantage < -1) advantageType = "black"

    setGameState({
      material: { white: whiteMaterial, black: blackMaterial },
      advantage: advantage,
      advantageType: advantageType,
    })
  }, [fen, game])

  function createRoom() {
    if (socket) {
      socket.emit("create_room", {}, (response: any) => {
        setRoomId(response.roomId)
        setOrientation("white")
        setInRoom(true)
        resetGame()
        setChatHistory(prev => [...prev, { role: "assistant", content: `Room created: ${response.roomId}. Waiting for opponent...` }])
        setIsLobbyOpen(false)
      })
    }
  }

  function joinRoom() {
    if (socket && joinInput.trim()) {
      socket.emit("join_room", joinInput.trim(), (response: any) => {
        if (response.success) {
          setRoomId(joinInput.toUpperCase())
          setOrientation("black")
          setInRoom(true)
          setOpponentConnected(true)
          resetGame()
          setChatHistory(prev => [...prev, { role: "assistant", content: `Joined room: ${joinInput.toUpperCase()}. You are playing as Black.` }])
          setIsLobbyOpen(false)
        } else {
          alert(response.message || "Failed to join room")
        }
      })
    }
  }

  function leaveRoom() {
    if (socket) {
      socket.disconnect()
      socket.connect() // Reconnect freshly
    }
    setInRoom(false)
    setRoomId("")
    setOpponentConnected(false)
    resetGame()
  }

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
    // Only allow moves if it's our turn in multiplayer, or anytime in local play
    if (inRoom) {
      if ((orientation === "white" && game.turn() !== "w") || 
          (orientation === "black" && game.turn() !== "b")) {
        return false // Not our turn
      }
      if (!opponentConnected) {
        // Can't play yet
        return false
      }
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    }
    
    const moveSuccessful = makeAMove(move)

    if (moveSuccessful) {
      if (inRoom && socket) {
        // Emit move to server
        socket.emit("move", { roomId, move })
      } else {
        // Local Bot play
        setTimeout(() => {
          const possibleMoves = game.moves()
          if (possibleMoves.length > 0 && !game.isGameOver()) {
            const randomIndex = Math.floor(Math.random() * possibleMoves.length)
            makeAMove(possibleMoves[randomIndex])
          }
        }, 300)
      }
      return true
    }
    return false
  }

  function resetGame() {
    const newGame = new Chess()
    setGame(newGame)
    setFen(newGame.fen())
    setMoveHistory([])
    setChatHistory([{ role: "assistant", content: "Board reset. Ready for a fresh battle!" }])
  }

  function flipBoard() {
    setOrientation(orientation === "white" ? "black" : "white")
  }

  async function handleSendMessage() {
    if (!userMessage.trim()) return

    const messageContent = userMessage
    setUserMessage("")

    if (inRoom && socket) {
      // Send chat to opponent
      setChatHistory(prev => [...prev, { role: "user", content: `You: ${messageContent}` }])
      socket.emit("chat_message", { roomId, message: messageContent, role: "user" })
    } else {
      // Play against AI Bot
      setChatHistory(prev => [...prev, { role: "user", content: messageContent }])
      setChatHistory(prev => [...prev, { role: "assistant", content: "Thinking..." }])

      try {
        const response = await getChessResponse(messageContent, game.fen(), {
          isCheck: game.isCheck(),
          isCheckmate: game.isCheckmate(),
          isDraw: game.isDraw(),
          isStalemate: game.isStalemate(),
          turn: game.turn() === "w" ? "white" : "black",
          material: { white: gameState.material.white, black: gameState.material.black },
          advantage: gameState.advantageType,
        })
        setChatHistory((prev) => [...prev.slice(0, prev.length - 1), { role: "assistant", content: response.message }])
      } catch (error) {
        setChatHistory((prev) => [
          ...prev.slice(0, prev.length - 1),
          { role: "assistant", content: "AI engine error. Try again?" },
        ])
      }
    }
  }

  async function getSuggestion() {
    if (inRoom) {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Suggestions are disabled in multiplayer mode!" }])
      return;
    }

    try {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Analyzing position..." }])
      const response = await getChessResponse(
        "Give me a suggestion for my next move based on the current position.",
        game.fen(),
        {
          isCheck: game.isCheck(),
          isCheckmate: game.isCheckmate(),
          isDraw: game.isDraw(),
          isStalemate: game.isStalemate(),
          turn: game.turn() === "w" ? "white" : "black",
          material: { white: gameState.material.white, black: gameState.material.black },
          advantage: gameState.advantageType,
        },
      )
      setChatHistory((prev) => [...prev.slice(0, prev.length - 1), { role: "assistant", content: response.message }])
    } catch (error) {
      setChatHistory((prev) => [
        ...prev.slice(0, prev.length - 1),
        { role: "assistant", content: "Error fetching suggestion." },
      ])
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white relative">
      <header className="border-b border-white/10 glass-panel p-4 sticky top-0 z-10 w-full">
        <div className="wrapper mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">ChessMaster</h1>
            {inRoom ? (
              <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-400 border-green-500/20">
                Live Room: {roomId}
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                vs AI
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {inRoom ? (
               <Button variant="destructive" size="sm" onClick={leaveRoom} className="glass-button">
                 Leave Room
               </Button>
            ) : (
                <Button variant="outline" size="sm" onClick={() => setIsLobbyOpen(!isLobbyOpen)} className="glass-button text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10">
                  <Users className="mr-2 h-4 w-4" /> Multiplayer
                </Button>
            )}

            <Button variant="outline" size="sm" onClick={flipBoard} className="glass-button text-gray-300">
              Flip Board
            </Button>
            <Button variant="outline" size="sm" onClick={resetGame} className="glass-button text-red-300 hover:text-red-200 hover:bg-red-500/10 border-red-500/20">
              <RefreshCw className="mr-2 h-4 w-4" /> Reset
            </Button>
          </div>
        </div>
      </header>

      {isLobbyOpen && !inRoom && (
        <div className="wrapper mx-auto mt-4 px-4 animate-in fade-in slide-in-from-top-4">
          <Card className="glass-card p-6 border-indigo-500/20 shadow-xl shadow-indigo-500/10">
            <h2 className="text-xl font-semibold mb-4 text-white">Multiplayer Lobby</h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <p className="text-sm text-gray-400">Create a new room and invite a friend.</p>
                <Button onClick={createRoom} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none shadow-lg shadow-indigo-500/20 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Create Room
                </Button>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-gray-500">or</span>
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-sm text-gray-400">Join an existing room using a code.</p>
                <div className="flex gap-2">
                  <Input 
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Room Code" 
                    className="glass-input uppercase"
                    maxLength={4}
                  />
                  <Button onClick={joinRoom} variant="outline" className="glass-button border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10">
                    <LogIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <main className="wrapper mx-auto p-4 mt-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Board Area */}
          <div className="lg:col-span-7 xl:col-span-8">
            <Card className="glass-card p-4 lg:p-6 overflow-hidden relative">
              {/* Opponent Status Overlay */}
              {inRoom && (
                <div className="mb-4 flex items-center justify-between p-3 rounded-lg bg-black/40 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${opponentConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                    <span className="text-sm font-medium text-gray-200">
                      {opponentConnected ? "Opponent Ready" : "Waiting for opponent..."}
                    </span>
                  </div>
                  <span className="text-sm px-3 py-1 rounded bg-white/5 border border-white/10 text-gray-300">
                    Playing as {orientation === 'white' ? 'White' : 'Black'}
                  </span>
                </div>
              )}

              <div className="aspect-square w-full max-w-[650px] mx-auto chess-board-wrapper">
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  boardOrientation={orientation}
                  customDarkSquareStyle={{ backgroundColor: "rgba(30, 41, 59, 0.9)" }}
                  customLightSquareStyle={{ backgroundColor: "rgba(100, 116, 139, 0.9)" }}
                  customBoardStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    overflow: "hidden"
                  }}
                  animationDuration={300}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {!inRoom && (
                  <Button onClick={getSuggestion} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none shadow-lg shadow-blue-500/20 text-white">
                    <Target className="mr-2 h-4 w-4" /> Get AI Suggestion
                  </Button>
                )}
                <Button variant="outline" onClick={() => setCurrentTab("openings")} className="glass-button text-gray-200">
                  <BookOpen className="mr-2 h-4 w-4" /> Openings
                </Button>
                <div className="hidden lg:block">
                  <Button variant="outline" onClick={() => setCurrentTab("chat")} className="glass-button text-gray-200">
                    <MessageSquare className="mr-2 h-4 w-4" /> Chat
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full flex-1 flex flex-col max-h-[850px]">
              <TabsList className="grid w-full grid-cols-3 glass-card mb-4 p-1">
                <TabsTrigger value="analysis" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Analysis</TabsTrigger>
                <TabsTrigger value="openings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Openings</TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400">Chat</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="border-none p-0 flex-1 m-0 h-full">
                <Card className="glass-card flex flex-col h-full">
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">Position Evaluation</h3>
                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 mb-6">
                      <EvaluationBar
                        advantage={gameState.advantage}
                        whiteScore={gameState.material.white}
                        blackScore={gameState.material.black}
                      />
                    </div>

                    <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">Game Analysis</h3>
                    <div className="mb-6">
                      <ChessAnalysis game={game} />
                    </div>

                    <h3 className="mb-3 mt-4 text-sm font-medium uppercase tracking-wider text-gray-400">Move History</h3>
                    <div className="bg-black/40 rounded-lg border border-white/5 max-h-[250px] overflow-y-auto custom-scrollbar">
                      <MoveHistory moves={moveHistory} />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="openings" className="border-none p-0 flex-1 m-0 h-full">
                <Card className="glass-card flex flex-col h-full">
                  <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                    <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-400">Popular Openings</h3>
                    <ul className="space-y-3">
                      {[
                        { title: "Sicilian Defense", desc: "1. e4 c5 - Sharp, asymmetrical opening that gives Black good counterplay" },
                        { title: "Queen's Gambit", desc: "1. d4 d5 2. c4 - White offers a pawn to gain central control" },
                        { title: "Ruy Lopez", desc: "1. e4 e5 2. Nf3 Nc6 3. Bb5 - One of the oldest and most respected openings" },
                        { title: "French Defense", desc: "1. e4 e6 - Solid choice for Black leading to closed positions" },
                        { title: "King's Indian Defense", desc: "1. d4 Nf6 2. c4 g6 - Hypermodern opening allowing White center control initially" }
                      ].map((op, i) => (
                        <li key={i} className="rounded-xl bg-black/40 p-4 border border-white/5 hover:bg-white/5 transition-colors">
                          <h4 className="font-semibold text-indigo-400 mb-1">{op.title}</h4>
                          <p className="text-sm text-gray-300 leading-relaxed">{op.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="border-none p-0 flex-1 m-0 h-full min-h-[500px]">
                <Card className="glass-card flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-4">
                      {chatHistory.map((message, index) => (
                        <ChatMessage key={index} role={message.role} content={message.content} />
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-white/10 p-4 bg-black/20">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder={inRoom ? "Chat with opponent..." : "Ask AI for advice..."}
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        className="min-h-[60px] flex-1 glass-input resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage()
                          }
                        }}
                      />
                      <Button onClick={handleSendMessage} className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white h-auto">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        
        <footer className="mt-12 py-6 border-t border-white/10 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
          <p className="font-medium text-gray-400">© {new Date().getFullYear()} Aniruddh Sharma. All rights reserved.</p>
          <div className="flex items-center justify-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
            <Info className="h-4 w-4 text-indigo-400" />
            <span className="text-gray-300">Powered by Next.js, Socket.IO & Gemini AI</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
