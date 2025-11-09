"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { TeamMembersTable } from "@/components/team-members-table"
import { RolesPanel } from "@/components/roles-panel"
import { AddMemberForm } from "@/components/add-member-form"

export function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: "admin1",
      email: "admin1@parkhub.com",
      role: "Admin",
      status: "active",
      joinDate: "2024-01-15",
      lastActive: "2 hours ago",
    },
    {
      id: 2,
      name: "manager1",
      email: "manager1@parkhub.com",
      role: "Manager",
      status: "active",
      joinDate: "2024-02-20",
      lastActive: "30 minutes ago",
    },
    {
      id: 3,
      name: "operator1",
      email: "operator1@parkhub.com",
      role: "Operator",
      status: "active",
      joinDate: "2024-03-10",
      lastActive: "1 hour ago",
    },
    {
      id: 4,
      name: "operator2",
      email: "operator2@parkhub.com",
      role: "Operator",
      status: "inactive",
      joinDate: "2024-04-05",
      lastActive: "3 days ago",
    },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleAddMember = (formData: any) => {
    if (editingId) {
      setTeamMembers(teamMembers.map((m) => (m.id === editingId ? { ...m, ...formData } : m)))
      setEditingId(null)
    } else {
      setTeamMembers([
        ...teamMembers,
        { ...formData, id: Date.now(), joinDate: new Date().toISOString().split("T")[0] },
      ])
    }
    setShowAddForm(false)
  }

  const handleDeleteMember = (id: number) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id))
  }

  const handleEditMember = (member: any) => {
    setEditingId(member.id)
    setShowAddForm(true)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Team Members */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
            <button
              onClick={() => {
                setEditingId(null)
                setShowAddForm(true)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus size={18} />
              Add Member
            </button>
          </div>

          {showAddForm && (
            <AddMemberForm
              onSave={handleAddMember}
              onCancel={() => {
                setShowAddForm(false)
                setEditingId(null)
              }}
              editingMember={editingId ? teamMembers.find((m) => m.id === editingId) : null}
            />
          )}

          <TeamMembersTable members={teamMembers} onEdit={handleEditMember} onDelete={handleDeleteMember} />
        </div>

        {/* Activity Log */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: "admin1", detail: "Updated pricing rules", time: "2 hours ago" },
              { action: "manager1", detail: "Added new parking lot", time: "4 hours ago" },
              { action: "operator1", detail: "Processed payment", time: "6 hours ago" },
              { action: "admin1", detail: "Invited operator2", time: "1 day ago" },
            ].map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition"
              >
                <div>
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="text-sm text-muted-foreground">{log.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Roles & Permissions */}
      <RolesPanel />
    </div>
  )
}
