'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Sparkles,
  Cloud,
  Search,
  Shield,
  Zap,
  Users,
  ArrowRight,
  BrainCircuit,
  Workflow,
  Database,
  MessageSquareText,
  ScanText,
  Wand2,
} from 'lucide-react'
import { getToken, logout } from '@/lib/auth'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = getToken()
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    logout()
    setIsLoggedIn(false)
    router.replace('/dashboard')
  }

  const features = [
    {
      icon: Cloud,
      title: 'Cloud Storage',
      description:
        'Store all your files securely in the cloud with unlimited access from anywhere.',
    },
    {
      icon: Search,
      title: 'AI-Powered Search',
      description:
        'Find files instantly using natural language. Just describe what you need.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description:
        'Your data is encrypted and protected with enterprise-grade security.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description:
        'Upload, download, and access your files with blazing fast speeds.',
    },
    {
      icon: Users,
      title: 'Easy Sharing',
      description:
        'Share files and folders with your team or clients effortlessly.',
    },
    {
      icon: Sparkles,
      title: 'Smart Organization',
      description:
        'AI helps organize your files automatically for better productivity.',
    },
  ]

  const aiSkills = [
    {
      icon: ScanText,
      title: 'Semantic File Retrieval',
      detail: 'Natural-language understanding to match user intent with file content context.',
    },
    {
      icon: MessageSquareText,
      title: 'Context-Aware File Chat',
      detail: 'Interactive Q&A on files with persistent session flow and conversation continuity.',
    },
    {
      icon: Wand2,
      title: 'Automated Media Intelligence',
      detail: 'AI-assisted subtitle workflow and smart content enhancement for uploaded videos.',
    },
  ]

  const aiWorkflow = [
    'Upload file metadata and extracted content',
    'Generate AI overview and searchable representation',
    'Run semantic search against user prompts',
    'Open file-level analysis chat for deeper insights',
  ]

  const techBadges = ['NLP', 'Semantic Search', 'Prompt Engineering', 'Contextual AI', 'AI UX']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur-xl border-b border-primary-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">KnowHere</span>
        </div>

        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <>
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Get started
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Open App
              </Link>
              <button
                onClick={handleLogout}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-sm text-primary-700 ring-1 ring-primary-100 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Semantic Search + Smart File Analysis</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Your files, organized by
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}
              AI
            </span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Store, search, and manage your files with the power of artificial
            intelligence. Find what you need in seconds, not minutes.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/register"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 text-lg font-medium"
                >
                  Get started for free
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/login"
                  className="px-8 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300 text-lg font-medium"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <Link
                href="/"
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg flex items-center gap-2 text-lg font-medium"
              >
                Go to Home
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-white/90 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-primary-100 hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-violet-50 rounded-lg flex items-center justify-center mb-4 ring-1 ring-primary-100">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">15 GB</div>
              <div className="text-gray-600">Free Storage</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">AI</div>
              <div className="text-gray-600">Powered Search</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">100%</div>
              <div className="text-gray-600">Secure & Private</div>
            </div>
          </div>
        </div>

        {/* AI Skills Showcase */}
        <div className="mb-16 rounded-3xl border border-primary-100 bg-white/90 p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Skills Implemented</h2>
              <p className="mt-1 text-gray-600">
                Clear product signals that highlight practical AI engineering skills.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-violet-50 px-4 py-2 text-sm font-medium text-primary-700 ring-1 ring-primary-100">
              <BrainCircuit className="h-4 w-4" />
              AI-first product design
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {aiSkills.map((skill) => {
              const Icon = skill.icon
              return (
                <div
                  key={skill.title}
                  className="rounded-2xl border border-primary-100 bg-gradient-to-br from-white to-primary-50/40 p-5"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-white p-2.5 text-primary-700 ring-1 ring-primary-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{skill.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{skill.detail}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-primary-100 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-primary-700">
                <Workflow className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-wide">AI Workflow</p>
              </div>
              <ol className="space-y-2 text-sm text-gray-700">
                {aiWorkflow.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-primary-100 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-violet-700">
                <Database className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-wide">Skill Tags</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {techBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-gradient-to-r from-primary-50 to-violet-50 px-3 py-1 text-xs font-medium text-primary-800 ring-1 ring-primary-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Join thousands of users who are already organizing their files with AI
          </p>

          {!isLoggedIn ? (
            <Link
              href="/register"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg shadow-lg"
            >
              Create your free account
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-lg shadow-lg"
            >
              Open your app
            </Link>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-gray-600 text-sm">
          <div>© 2024 KnowHere. All rights reserved.</div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-gray-900">
              Privacy
            </a>
            <a href="#" className="hover:text-gray-900">
              Terms
            </a>
            <a href="#" className="hover:text-gray-900">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}