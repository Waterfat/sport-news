"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  currentDate: string; // YYYYMMDD
  onDateChange: (date: string) => void;
}

function formatDisplayDate(dateStr: string): string {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return "今天";
  if (diffDays === -1) return "昨天";
  if (diffDays === 1) return "明天";

  return date.toLocaleDateString("zh-TW", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function shiftDate(dateStr: string, days: number): string {
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(4, 6)) - 1;
  const d = parseInt(dateStr.slice(6, 8));
  const date = new Date(y, m, d);
  date.setDate(date.getDate() + days);

  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}${nm}${nd}`;
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export default function DatePicker({ currentDate, onDateChange }: DatePickerProps) {
  const today = getTodayStr();
  const isToday = currentDate === today;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, -1))}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={() => onDateChange(today)}
        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
          isToday
            ? "bg-blue-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        {formatDisplayDate(currentDate)}
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, 1))}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export { getTodayStr };
