import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

const sizeClasses = {
  sm: "max-w-4xl",
  md: "max-w-6xl", 
  lg: "max-w-7xl",
  xl: "max-w-[1440px]",
  full: "max-w-full"
}

export function Container({ 
  children, 
  className, 
  size = "xl" 
}: ContainerProps) {
  return (
    <div className={cn(
      "mx-auto px-4 sm:px-6 lg:px-8",
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  )
}