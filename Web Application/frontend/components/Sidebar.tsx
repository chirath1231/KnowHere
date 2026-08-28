'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Folder, Star, Trash2, Settings, HardDrive, Sparkles } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  
  const menuItems = [
    { icon: Home, label: 'My Drive', href: '/', active: pathname === '/' },
    { icon: Folder, label: 'Folders', href: '/folders', active: pathname === '/folders' },
    { icon: Star, label: 'AIOverview', href: '/AIOverviewPage', active: pathname === '/AIOverviewPage' },
    { icon: Trash2, label: 'Trash', href: '/trash', active: pathname === '/trash' },
    { icon: HardDrive, label: 'Subscription', href: '/subscription', active: pathname === '/subscription' },
    { icon: Settings, label: 'Settings', href: '/settings', active: pathname === '/settings' },
  ]

  return (
    <aside className="w-64 bg-white/85 backdrop-blur-xl border-r border-primary-100 flex flex-col shadow-xl shadow-primary-100/40">
      <div className="p-6 border-b border-primary-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-700 to-violet-700 bg-clip-text text-transparent">
              KnowHere
            </h1>
            <p className="text-xs text-primary-700/80 mt-0.5">AI-Powered Storage</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                    item.active
                      ? 'bg-gradient-to-r from-primary-50 to-violet-50 text-primary-800 font-semibold shadow-sm ring-1 ring-primary-100'
                      : 'text-gray-700 hover:bg-primary-50/50 hover:text-primary-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-primary-100">
        <div className="rounded-xl p-4 bg-gradient-to-br from-primary-50 to-violet-50 border border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-800">Storage</span>
            <span className="text-sm text-primary-700">15 GB</span>
          </div>
          <div className="w-full bg-white/80 rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-primary-500 to-violet-500 h-2.5 rounded-full"
              style={{ width: '45%' }}
            ></div>
          </div>
          <p className="text-xs text-primary-700/80 mt-2">6.8 GB of 15 GB used</p>
        </div>
      </div>
    </aside>
  )
}

