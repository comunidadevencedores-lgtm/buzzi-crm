'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()
  const isActive = (path: string) => pathname.includes(path)

  const navItems = [
    { name: 'Kanban', path: '/admin/kanban', icon: '📊' },
    { name: 'Leads', path: '/admin/leads', icon: '👥' },
    { name: 'Disparos', path: '/admin/send-batch', icon: '📤' },
    { name: 'Configurações', path: '/admin/settings', icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col border-r border-slate-700`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-white text-sm">
              FL
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-bold text-sm">FLIP CRM</div>
                <div className="text-xs text-slate-400">Prospecção & Atendimento</div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          ))}
        </nav>

        {/* Toggle */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <span className="text-lg">{sidebarOpen ? '◀️' : '▶️'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">FLIP CRM</h1>
            <p className="text-sm text-slate-500">Prospecção & Atendimento Inteligente</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-white text-sm">
              FL
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
