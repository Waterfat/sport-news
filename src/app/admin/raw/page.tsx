"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";

interface RawArticle {
  id: string;
  source: string;
  title: string;
  url: string;
  category: string | null;
  crawled_at: string;
  is_processed: boolean;
}

export default function RawArticlesPage() {
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(20));
  const [source, setSource] = useQueryState("source", parseAsString.withDefault("all"));
  const [jumpInput, setJumpInput] = useState("");

  const { data, isLoading } = useQuery<{ articles: RawArticle[]; total: number }>({
    queryKey: ["raw-articles", page, pageSize, source],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (source !== "all") params.set("source", source);
      const res = await fetch(`/api/articles/raw?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const articles = data?.articles || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleJump = () => {
    const target = parseInt(jumpInput, 10);
    if (target >= 1 && target <= totalPages) {
      setPage(target);
      setJumpInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">素材庫</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="text-sm text-gray-500">共 {total} 篇</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  每頁 {size} 篇
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={source}
            onValueChange={(v) => {
              setSource(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="篩選來源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部來源</SelectItem>
              <SelectItem value="ESPN">ESPN</SelectItem>
              <SelectItem value="Yahoo Sports">Yahoo Sports</SelectItem>
              <SelectItem value="ETtoday 體育">ETtoday 體育</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暫無新聞資料</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">標題</TableHead>
                <TableHead className="w-[120px]">來源</TableHead>
                <TableHead className="w-[60px] hidden md:table-cell">分類</TableHead>
                <TableHead className="w-[70px]">狀態</TableHead>
                <TableHead className="w-[150px] hidden sm:table-cell">爬取時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="overflow-hidden">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-700 line-clamp-1"
                    >
                      {article.title}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap text-xs">{article.source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm hidden md:table-cell">
                    {article.category || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={article.is_processed ? "secondary" : "default"}
                      className="whitespace-nowrap"
                    >
                      {article.is_processed ? "已處理" : "未處理"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap hidden sm:table-cell">
                    {new Date(article.crawled_at).toLocaleString("zh-TW")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={page}
        totalPages={totalPages}
        jumpInput={jumpInput}
        onPageChange={setPage}
        onJumpInputChange={setJumpInput}
        onJump={handleJump}
      />
    </div>
  );
}
