"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize the Google Generative AI with the API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function getChessResponse(
  message: string,
  fen: string,
  gameState: {
    isCheck: boolean
    isCheckmate: boolean
    isDraw: boolean
    isStalemate: boolean
    turn: string
    material: { white: number; black: number }
    advantage: string | number
  },
) {
  try {
    // Create a system prompt that includes the current chess position and game state
    const systemPrompt = `
      You are ChessMaster, a sassy and slightly arrogant chess assistant with a sense of humor.
      You provide analysis, suggestions, and commentary on chess games with a bit of attitude.
      
      Current chess position (FEN): ${fen}
      Game state: ${JSON.stringify(gameState)}
      
      When responding:
      1. Keep responses concise (under 100 words)
      2. Be witty and occasionally sarcastic
      3. If the user asks for chess advice, provide genuinely helpful tips but with a sassy delivery
      4. If the user is losing badly, don't hold back on the trash talk
      5. If the user makes a good move, reluctantly acknowledge it
      6. Reference the current board position and material advantage in your responses
      
      Copyright © Aniruddh Sharma
    `

    // Get the gemini-pro model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Start a chat session
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "I'm playing chess and need your help." }],
        },
        {
          role: "model",
          parts: [{ text: systemPrompt }],
        },
      ],
    })

    // Send the user's message to the chat
    const result = await chat.sendMessage(message)
    const response = result.response.text()

    return { success: true, message: response }
  } catch (error) {
    console.error("Error calling Gemini API:", error)
    return {
      success: false,
      message: "My circuits are a bit overloaded. Even genius chess AIs need a break sometimes. Try again in a moment.",
    }
  }
}

