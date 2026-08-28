'use client'

import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

type Plan = {
  id: string
  name: string
  price: number
  features: string[]
  storage: string
  ai_features: string[]
}

function normalizePlan(plan: any): Plan {
  return {
    id: plan.id || plan._id || '',
    name: plan.name || 'Unnamed Plan',
    price: typeof plan.price === 'number' ? plan.price : Number(plan.price || 0),
    storage: plan.storage || 'N/A',
    features: Array.isArray(plan.features) ? plan.features : [],
    ai_features: Array.isArray(plan.ai_features) ? plan.ai_features : [],
  }
}

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true)
        setError('')

        const res = await fetch(`${API_BASE_URL}/subscriptions/`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.detail || 'Failed to fetch subscription plans')
        }

        const normalizedPlans = Array.isArray(data)
          ? data.map(normalizePlan)
          : []

        setPlans(normalizedPlans)
      } catch (err: any) {
        setError(err.message || 'Something went wrong while loading plans')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  return (
    <Layout showAISearch={false}>
      <main className="flex-1 overflow-y-auto bg-transparent px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
              AI-ready pricing for creators and teams
            </div>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Subscription Plans
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
              Choose the best plan for your storage and AI needs. Upgrade anytime as your usage grows.
            </p>
          </div>

          {loading && (
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p className="text-gray-600">Loading subscription plans...</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-red-700">Failed to load plans</h2>
              <p className="mt-2 text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && plans.length === 0 && (
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">No plans available</h2>
              <p className="mt-2 text-sm text-gray-600">
                There are no subscription plans in the database yet.
              </p>
            </div>
          )}

          {!loading && !error && plans.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan, index) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-2xl border bg-white/90 p-5 shadow-sm transition hover:shadow-md sm:p-6 ${
                    index === 1
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-blue-100/60'
                      : 'border-primary-100'
                  }`}
                >
                  {index === 1 && (
                    <div className="mb-4 inline-flex w-fit rounded-full bg-gradient-to-r from-blue-50 to-violet-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="pb-1 text-sm text-gray-500">/month</span>
                    </div>
                  </div>

                  <div className="mb-5 rounded-xl bg-gradient-to-r from-primary-50 to-violet-50 p-4 border border-primary-100">
                    <p className="text-sm font-medium text-gray-600">Storage</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{plan.storage}</p>
                  </div>

                  <div className="mb-5">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Features
                    </h3>
                    {plan.features.length > 0 ? (
                      <ul className="space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                            <span className="text-sm leading-6 text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No features listed</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      AI Features
                    </h3>
                    {plan.ai_features.length > 0 ? (
                      <ul className="space-y-2">
                        {plan.ai_features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-purple-500" />
                            <span className="text-sm leading-6 text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No AI features listed</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className={`mt-auto w-full rounded-xl px-4 py-3 text-sm font-medium transition ${
                      index === 1
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-md shadow-blue-500/20'
                        : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="h-8" />
        </div>
      </main>
    </Layout>
  )
}