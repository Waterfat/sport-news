"use client";

const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "NBA", label: "NBA" },
  { key: "棒球", label: "MLB" },
  { key: "足球", label: "足球" },
  { key: "綜合", label: "綜合" },
];

export function HomeCategoryFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (category: string) => void;
}) {
  return (
    <div className="flex overflow-x-auto scrollbar-hide translate-y-px">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
            active === cat.key
              ? "text-foreground border-blue-500 font-bold"
              : "text-muted-foreground border-transparent hover:text-foreground"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
