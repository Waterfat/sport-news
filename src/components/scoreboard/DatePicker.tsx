"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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

function toInputDate(dateStr: string): string {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

function fromInputDate(inputDate: string): string {
  return inputDate.replace(/-/g, "");
}

function getTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export default function DatePicker({ currentDate, onDateChange }: DatePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const today = getTodayStr();
  const isToday = currentDate === today;

  // Close calendar on click outside
  useEffect(() => {
    if (!calendarOpen) return;
    function handleClick(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  return (
    <div className="flex items-center gap-1 relative" ref={calendarRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, -1))}
        className="h-9 w-9 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={() => isToday ? setCalendarOpen(!calendarOpen) : onDateChange(today)}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors min-w-[80px] ${
          isToday
            ? "bg-brand text-brand-foreground"
            : "bg-secondary text-foreground hover:bg-accent"
        }`}
      >
        {formatDisplayDate(currentDate)}
      </button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDateChange(shiftDate(currentDate, 1))}
        className="h-9 w-9 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setCalendarOpen(!calendarOpen)}
        className="h-9 w-9 p-0 text-muted-foreground"
      >
        <Calendar className="h-4 w-4" />
      </Button>

      {/* Calendar dropdown */}
      {calendarOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-card border border-border rounded-xl shadow-lg p-3">
          <input
            type="date"
            value={toInputDate(currentDate)}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(fromInputDate(e.target.value));
                setCalendarOpen(false);
              }
            }}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      )}
    </div>
  );
}

export { getTodayStr };
