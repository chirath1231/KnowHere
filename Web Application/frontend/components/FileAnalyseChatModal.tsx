'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Send, Sparkles, Loader2, BrainCircuit, Database, Workflow } from 'lucide-react'
import { chatWithAnalysedFile } from '@/lib/api'
import { FileItem } from '@/types/file'

type Message = {
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

type Source = {
  chunk_index: number
  score: number
  text: string
}

type Props = {
  open: boolean
  file: FileItem | null
  sessionId: string | null
  initialMessages: Message[]
  onClose: () => void
  onSessionChange: (sessionId: string, messages: Message[]) => void
}

export default function FileAnalyseChatModal({
  open,
  file,
  sessionId,
  initialMessages,
  onClose,
  onSessionChange,
}: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(initialMessages || [])
  const [sending, setSending] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const suggestedPrompts = [
    'Summarize this file in bullet points',
    'What are the most important insights?',
    'Extract action items from this file',
    'Explain this file for a non-technical audience',
  ]

  useEffect(() => {
    setMessages(initialMessages || [])
  }, [initialMessages, file?.id])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, sending])

  if (!open || !file) return null

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const optimisticUserMessage: Message = {
      role: 'user',
      content: trimmed,
    }

    const nextMessages = [...messages, optimisticUserMessage]
    setMessages(nextMessages)
    setInput('')
    setSending(true)

    try {
      const response = await chatWithAnalysedFile(file.id, trimmed, sessionId)
      setMessages(response.messages || [])
      setSources(response.sources || [])
      onSessionChange(response.session_id, response.messages || [])
    } catch (error: any) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: error?.message || 'Failed to get AI answer for this file.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex w-full flex-col md:w-[72%]">
          <div className="flex items-center justify-between border-b border-primary-100 bg-gradient-to-r from-primary-50 to-violet-50 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Sparkles className="h-5 w-5 text-primary-600" />
                RAG File Assistant
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Chatting about: {file.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-primary-700 ring-1 ring-primary-100">
                  <Database className="h-3 w-3" />
                  Retrieval
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100">
                  <BrainCircuit className="h-3 w-3" />
                  Reasoning
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                  <Workflow className="h-3 w-3" />
                  Source-grounded
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-5">
            {messages.length === 0 ? (
              <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Ask anything about this file
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Example: summarize this file, explain the main idea, list key
                  points, or answer a question from the file.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setInput(prompt)}
                      className="rounded-full bg-primary-50 px-3 py-1 text-xs text-primary-700 ring-1 ring-primary-100 hover:bg-primary-100"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-4">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-primary-600 to-violet-600 text-white'
                          : 'border border-gray-200 bg-white text-gray-800'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">
                          <Sparkles className="h-3 w-3" />
                          RAG answer
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Retrieving and reasoning...
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-2xl border border-gray-300 bg-white p-3 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                rows={2}
                placeholder="Ask a grounded question about this file..."
                className="max-h-40 min-h-[44px] flex-1 resize-none border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
              />

              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden w-[28%] border-l border-gray-200 bg-white md:block">
          <div className="border-b border-gray-200 px-4 py-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Retrieval Sources
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Top chunks used for the latest answer
            </p>
          </div>

          <div className="h-[calc(85vh-81px)] overflow-y-auto p-4">
            {sources.length === 0 ? (
              <p className="text-sm text-gray-500">
                Sources will appear after the AI answers.
              </p>
            ) : (
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Chunk #{source.chunk_index + 1}</span>
                      <span>Score: {source.score.toFixed(3)}</span>
                    </div>
                    <div className="mb-2 h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-primary-500 to-violet-500"
                        style={{ width: `${Math.max(8, Math.min(100, source.score * 100))}%` }}
                      />
                    </div>
                    <p className="text-xs leading-5 text-gray-700">
                      {source.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}