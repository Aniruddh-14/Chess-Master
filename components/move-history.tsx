import { ScrollArea } from "@/components/ui/scroll-area"

interface MoveHistoryProps {
  moves: string[]
}

export default function MoveHistory({ moves }: MoveHistoryProps) {
  if (moves.length === 0) {
    return (
      <div className="rounded bg-gray-800 p-3 text-center text-sm text-gray-400">
        No moves played yet. Make a move to start the game.
      </div>
    )
  }

  return (
    <ScrollArea className="h-[200px] rounded border border-gray-800">
      <div className="p-3">
        {moves.map((move, index) => (
          <div
            key={index}
            className={`mb-1 flex items-center rounded p-1 ${move.startsWith("White") ? "bg-gray-800" : "bg-gray-900"}`}
          >
            <span className="mr-2 text-xs text-gray-500">{Math.floor(index / 2) + 1}.</span>
            <span className={move.startsWith("White") ? "text-gray-200" : "text-gray-400"}>{move}</span>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

