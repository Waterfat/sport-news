"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface PlanItem {
  id: string;
  title: string;
  raw_article_ids: string[];
  league: string | null;
  plan_type: string;
  created_at: string;
  writer_personas: { name: string; writer_type: string } | null;
}

export interface RawArticleInfo {
  title: string;
  source: string;
  url: string;
}

interface PlansTableProps {
  plans: PlanItem[];
  selectedPlanIds: Set<string>;
  rawArticleMap: Record<string, RawArticleInfo>;
  planLoading: boolean;
  rewriteCurrentTask: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onProduce: () => void;
  onDelete: () => void;
}

export function PlansTable({
  plans,
  selectedPlanIds,
  rawArticleMap,
  planLoading,
  rewriteCurrentTask,
  onToggleSelect,
  onToggleSelectAll,
  onProduce,
  onDelete,
}: PlansTableProps) {
  if (plans.length === 0) return null;

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">規劃列表 ({plans.length} 項)</h2>
            {plans.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                最後規劃時間：{new Date(plans[plans.length - 1].created_at).toLocaleString("zh-TW")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedPlanIds.size > 0 && (
              <>
                <span className="text-sm text-gray-500">已選 {selectedPlanIds.size} 項</span>
                <Button
                  size="sm"
                  disabled={planLoading || rewriteCurrentTask}
                  onClick={onProduce}
                >
                  產出文章
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={planLoading}
                  onClick={onDelete}
                >
                  移除
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={plans.length > 0 && selectedPlanIds.size === plans.length}
                    onCheckedChange={onToggleSelectAll}
                  />
                </TableHead>
                <TableHead>預計標題</TableHead>
                <TableHead className="hidden sm:table-cell">寫手</TableHead>
                <TableHead className="hidden sm:table-cell">類型</TableHead>
                <TableHead className="hidden md:table-cell">引用原文</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  className={selectedPlanIds.has(plan.id) ? "bg-blue-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedPlanIds.has(plan.id)}
                      onCheckedChange={() => onToggleSelect(plan.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-start gap-2">
                      <span>{plan.title}</span>
                      <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gray-100 text-xs text-gray-500 flex-shrink-0">
                        {(plan.raw_article_ids || []).length}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{plan.writer_personas?.name || "-"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={plan.plan_type === "official" ? "default" : "outline"}>
                      {plan.plan_type === "official" ? "官方戰報" : "專欄"}
                      {plan.league ? ` · ${plan.league}` : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1 max-w-xs">
                      {(plan.raw_article_ids || []).slice(0, 3).map((rawId) => {
                        const info = rawArticleMap[rawId];
                        return info ? (
                          <a
                            key={rawId}
                            href={info.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={info.title}
                          >
                            <span className="text-gray-400">[{info.source}]</span> {info.title}
                          </a>
                        ) : null;
                      })}
                      {(plan.raw_article_ids || []).length > 3 && (
                        <div className="text-xs text-gray-400">
                          ...還有 {plan.raw_article_ids.length - 3} 篇
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
