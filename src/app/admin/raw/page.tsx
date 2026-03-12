"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [articles, setArticles] = useState<RawArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [source, setSource] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (source !== "all") params.set("source", source);

    try {
      const res = await fetch(`/api/articles/raw?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [page, source]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">原始新聞</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">共 {total} 篇</span>
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

      {loading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暫無新聞資料</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">標題</TableHead>
                <TableHead>來源</TableHead>
                <TableHead>分類</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>爬取時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-blue-700"
                    >
                      {article.title}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{article.source}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {article.category || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={article.is_processed ? "secondary" : "default"}
                    >
                      {article.is_processed ? "已處理" : "未處理"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(article.crawled_at).toLocaleString("zh-TW")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <span className="text-sm text-gray-500">
            第 {page} / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
