'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, MessageCircle, Send, Sparkles, Wand2, X } from 'lucide-react'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

function nowId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitize(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function getStoredToken() {
  if (typeof window === 'undefined') return null

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access') ||
    localStorage.getItem('access_token')
  )
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nowId(),
      role: 'assistant',
      content: 'Hi! I’m your KnowHere AI assistant. How can I help you today?',
    },
  ])

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [isOpen, messages.length, isThinking])

  const canSend = useMemo(() => sanitize(input).length > 0 && !isThinking, [input, isThinking])
  const demoPrompts = [
    'Summarize my latest uploaded files',
    'Find important project docs',
    'Suggest folder structure for AI project',
    'What can this AI assistant do?',
  ]

  async function sendMessage() {
    const text = sanitize(input)
    if (!text || isThinking) return

    const token = getStoredToken()

    if (!token) {
      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          role: 'assistant',
          content: 'You are not logged in. Please sign in first.',
        },
      ])
      return
    }

    const userMessage: ChatMessage = {
      id: nowId(),
      role: 'user',
      content: text,
    }

    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput('')
    setIsThinking(true)

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (res.status === 401) {
        throw new Error('Unauthorized. Please log in again.')
      }

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Failed to get AI response')
      }

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          role: 'assistant',
          content: data.reply || 'Sorry, I could not generate a response.',
        },
      ])
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: nowId(),
          role: 'assistant',
          content: error.message || 'Something went wrong while connecting to the AI backend.',
        },
      ])
      console.error('CHAT ERROR:', error)
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-600 to-violet-600 px-4 py-3 text-white shadow-lg shadow-primary-500/30 hover:from-primary-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
          aria-label="Open chat"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline font-medium">AI Chat</span>
        </button>
      ) : (
        <div className="w-[340px] sm:w-[400px] h-[560px] rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-violet-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div className="leading-tight">
                <div className="font-semibold">AI Chat</div>
                <div className="text-xs text-white/80">KnowHere Assistant v1</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-primary-100 bg-gradient-to-r from-primary-50 to-violet-50 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-primary-100">
                <Sparkles className="h-3 w-3" />
                NLP Search
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                <Wand2 className="h-3 w-3" />
                Context Chat
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {demoPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] text-gray-700 ring-1 ring-gray-200 hover:ring-primary-200 hover:text-primary-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md ring-1 ring-black/5',
                  ].join(' ')}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                      <Bot className="h-3 w-3" />
                      AI Assistant
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-sm text-gray-700 ring-1 ring-black/5">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
                    Thinking with context...
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-white px-3 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void sendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about files, AI search, summaries..."
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-violet-600 px-3 py-2 text-white shadow-sm hover:from-primary-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-400"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}