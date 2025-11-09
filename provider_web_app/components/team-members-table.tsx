"use client"

import { Edit2, Trash2, CheckCircle, AlertCircle } from "lucide-react"

interface TeamMembersTableProps {
  members: any[]
  onEdit: (member: any) => void
  onDelete: (id: number) => void
}

export function TeamMembersTable({ members, onEdit, onDelete }: TeamMembersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Name</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Email</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Role</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Last Active</th>
            <th className="text-left py-3 px-4 text-muted-foreground font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b border-border hover:bg-muted/50 transition">
              <td className="py-3 px-4">
                <p className="font-semibold text-foreground">{member.name}</p>
              </td>
              <td className="py-3 px-4 text-foreground">{member.email}</td>
              <td className="py-3 px-4">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  {member.role}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {member.status === "active" ? (
                    <>
                      <CheckCircle size={16} className="text-chart-1" />
                      <span className="text-chart-1 font-medium">Active</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">Inactive</span>
                    </>
                  )}
                </div>
              </td>
              <td className="py-3 px-4 text-muted-foreground">{member.lastActive}</td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(member)}
                    className="p-1 hover:bg-muted rounded transition text-foreground"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(member.id)}
                    className="p-1 hover:bg-destructive/10 rounded transition text-destructive"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
