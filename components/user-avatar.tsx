"use client"

import { useMemo } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface UserAvatarProps {
  name: string
  email: string
  className?: string
}

export function UserAvatar({ name, email, className }: UserAvatarProps) {
  const initials = useMemo(() => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [name])

  const backgroundColor = useMemo(() => {
    const colors = [
      "bg-[hsl(var(--chart-1))]",
      "bg-[hsl(var(--chart-2))]",
      "bg-[hsl(var(--chart-3))]",
      "bg-[hsl(var(--chart-4))]",
      "bg-[hsl(var(--chart-5))]",
    ]
    // Use email as a consistent way to pick a color
    const index = [...email].reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }, [email])

  return (
    <Avatar className={className}>
      <AvatarFallback className={`${backgroundColor} text-primary-foreground`}>{initials}</AvatarFallback>
    </Avatar>
  )
}

