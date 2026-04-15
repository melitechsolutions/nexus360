import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export interface SummaryCard {
  label: string;
  value: string | number;
  count?: number;
  color?: "blue" | "green" | "orange" | "red" | "purple" | "gray";
  progress?: number;
}

const colorMap = {
  blue: { bar: "bg-blue-400", text: "text-blue-600" },
  green: { bar: "bg-emerald-400", text: "text-emerald-600" },
  orange: { bar: "bg-orange-400", text: "text-orange-600" },
  red: { bar: "bg-red-400", text: "text-red-600" },
  purple: { bar: "bg-purple-400", text: "text-purple-600" },
  gray: { bar: "bg-gray-400", text: "text-gray-600" },
};

export interface SummaryStatCardsProps {
  cards: SummaryCard[];
  className?: string;
}

export function SummaryStatCards({ cards, className }: SummaryStatCardsProps) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-0 rounded-xl border bg-white dark:bg-slate-900 overflow-hidden", className)}>
      {cards.map((card, i) => {
        const c = colorMap[card.color || "blue"];
        return (
          <div
            key={i}
            className={cn(
              "p-5 relative",
              i < cards.length - 1 && "border-r border-border"
            )}
          >
            <h3 className="text-2xl font-bold text-foreground">{card.value}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {card.label}
              {card.count !== undefined && ` (${card.count})`}
            </p>
            <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", c.bar)}
                style={{ width: `${card.progress ?? 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
