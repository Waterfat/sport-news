"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_VARIANT } from "@/lib/constants";

export interface Article {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  images: string[];
  writer_personas: {
    name: string;
  } | null;
}

interface ArticlesTableProps {
  articles: Article[];
  loading: boolean;
  selectedIds: Set<string>;
  publishingIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPublishOne: (articleId: string) => void;
  onScheduleConfirm: (articleId: string, datetime: string) => void;
}

export function ArticlesTable({
  articles,
  loading,
  selectedIds,
  publishingIds,
  onToggleSelect,
  onToggleSelectAll,
  onPublishOne,
  onScheduleConfirm,
}: ArticlesTableProps) {
  const [scheduleOpenId, setScheduleOpenId] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (articles.length === 0) {
    return <div className="text-center py-12 text-gray-500">暫無文章</div>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={articles.length > 0 && selectedIds.size === articles.length}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead className="w-[40%]">標題</TableHead>
            <TableHead className="w-[100px]">寫手</TableHead>
            <TableHead className="w-[80px]">狀態</TableHead>
            <TableHead className="w-[140px]">建立時間</TableHead>
            <TableHead className="w-[200px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => {
            const statusLabel = ARTICLE_STATUS_LABELS[article.status] || ARTICLE_STATUS_LABELS.draft;
            const statusVariant = ARTICLE_STATUS_VARIANT[article.status] || ARTICLE_STATUS_VARIANT.draft;
            return (
              <TableRow
                key={article.id}
                className={selectedIds.has(article.id) ? "bg-blue-50" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(article.id)}
                    onCheckedChange={() => onToggleSelect(article.id)}
                  />
                </TableCell>
                <TableCell className="font-medium overflow-hidden">
                  <div className="flex items-start gap-3">
                    {article.images?.[0] && (
                      <Image
                        src={article.images[0]}
                        alt=""
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded flex-shrink-0 mt-0.5"
                        unoptimized
                      />
                    )}
                    <div className="min-w-0 overflow-hidden">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="hover:underline line-clamp-1"
                      >
                        {article.title}
                      </Link>
                      {article.content && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                          {article.content.substring(0, 100)}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="truncate">
                  {article.writer_personas?.name || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>
                    {statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-500">
                  <div>{new Date(article.created_at).toLocaleString("zh-TW")}</div>
                  {article.scheduled_at && (
                    <div className="text-blue-600 text-xs mt-1">
                      排程：{new Date(article.scheduled_at).toLocaleString("zh-TW")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    {article.status === "draft" && !article.scheduled_at && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={publishingIds.has(article.id)}
                          onClick={() => onPublishOne(article.id)}
                        >
                          {publishingIds.has(article.id) ? (
                            <span className="flex items-center gap-1">
                              <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                              發布中
                            </span>
                          ) : (
                            "發布"
                          )}
                        </Button>
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setScheduleOpenId(
                                scheduleOpenId === article.id ? null : article.id
                              )
                            }
                          >
                            排程
                          </Button>
                          {scheduleOpenId === article.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg p-3 space-y-2 w-[260px]">
                              <Input
                                type="datetime-local"
                                value={scheduleDateTime}
                                onChange={(e) => setScheduleDateTime(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  disabled={!scheduleDateTime}
                                  onClick={() => {
                                    onScheduleConfirm(article.id, scheduleDateTime);
                                    setScheduleOpenId(null);
                                    setScheduleDateTime("");
                                  }}
                                  className="flex-1"
                                >
                                  確認排程
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setScheduleOpenId(null);
                                    setScheduleDateTime("");
                                  }}
                                >
                                  取消
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <Link href={`/admin/articles/${article.id}`}>
                      <Button variant="outline" size="sm">
                        查看
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
