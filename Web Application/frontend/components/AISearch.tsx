'use client'

import { useState } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'

interface AISearchProps {
  onSearch: (prompt: string) => Promise<void> | void
}

export default function AISearch({ onSearch }: AISearchProps) {
  const [prompt, setPrompt] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isSearching) return

    try {
      setIsSearching(true)
      await onSearch(prompt)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 via-violet-50 to-blue-50 border-b border-primary-100 px-6 py-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-primary-700 rounded-full bg-white/70 ring-1 ring-primary-100 px-3 py-1.5">
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-sm">AI Search</span>
          </div>

          <div className="flex-1 relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI to find files... (e.g., 'Find the payment success page', 'Show me the landing page file')"
              className="w-full px-4 py-2.5 pr-12 border border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
              disabled={isSearching}
            />

            <button
              type="submit"
              disabled={!prompt.trim() || isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-lg hover:from-primary-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <p className="text-sm text-primary-800/80 mt-2 ml-20">
          AI compares your request with each file’s AI overview and finds the most relevant files.
        </p>
      </form>
    </div>
  )
}