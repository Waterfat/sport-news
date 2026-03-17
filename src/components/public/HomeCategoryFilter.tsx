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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
            active === cat.key
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
