import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"

interface RecentActivityProps {
  data: any[];
}

export function RecentActivity({ data }: RecentActivityProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No recent activity found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1">
      {data.map((activity) => {
        const initials = activity.customer 
          ? activity.customer.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() 
          : "??";
        
        const isConfirmed = activity.type === "CONFIRMED";
        const isCancelled = activity.type === "CANCELLED";

        return (
          <div key={activity.id} className="flex items-center">
            <Avatar className="h-9 w-9 border border-border/40 shrink-0">
              <AvatarFallback className={`font-bold ${
                isConfirmed ? 'bg-green-500/10 text-green-400' :
                isCancelled ? 'bg-red-500/10 text-red-400' :
                'bg-cyan-500/10 text-cyan-400'
              }`}>{initials}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-0.5 overflow-hidden flex-1">
              <p className="text-sm font-medium leading-none text-white truncate">{activity.message}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(activity.timestamp).toLocaleTimeString()} - {new Date(activity.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
