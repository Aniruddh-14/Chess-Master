import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

interface ChatMessageProps {
  role: string
  content: string
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isLoading = content === "Thinking..." || content === "Analyzing position..."

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] gap-2 ${role === "user" ? "flex-row-reverse" : "flex-row"}`}>
        <Avatar className={role === "assistant" ? "bg-yellow-900" : "bg-indigo-900"}>
          <AvatarFallback>{role === "assistant" ? "CM" : "U"}</AvatarFallback>
          {role === "assistant" && <AvatarImage src="/placeholder.svg?height=40&width=40" />}
        </Avatar>
        <div className={`rounded-lg p-3 ${role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-100"}`}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p>{content}</p>
            </div>
          ) : (
            <p>{content}</p>
          )}
        </div>
      </div>
    </div>
  )
}

