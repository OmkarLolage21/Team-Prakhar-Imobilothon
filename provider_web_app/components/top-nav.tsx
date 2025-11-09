"use client"

import { Menu, Bell, Settings, User } from "lucide-react"

interface TopNavProps {
  onMenuClick: () => void
}

export function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <button onClick={onMenuClick} className="lg:hidden text-foreground hover:bg-muted rounded p-2">
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-muted rounded-lg transition text-foreground">
          <Bell size={20} />
        </button>
        <button className="p-2 hover:bg-muted rounded-lg transition text-foreground">
          <Settings size={20} />
        </button>
        <button className="p-2 hover:bg-muted rounded-lg transition text-foreground">
          <User size={20} />
        </button>
      </div>
    </header>
  )
}
