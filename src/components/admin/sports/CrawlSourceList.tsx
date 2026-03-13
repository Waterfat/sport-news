"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CrawlSource, CrawlResult } from "./types";

interface CrawlSourceListProps {
  crawlSources: CrawlSource[];
  editingId: number | null;
  editName: string;
  editUrl: string;
  crawlingId: number | null;
  crawlResult: CrawlResult | null;
  newName: string;
  newUrl: string;
  adding: boolean;
  onEditNameChange: (name: string) => void;
  onEditUrlChange: (url: string) => void;
  onNewNameChange: (name: string) => void;
  onNewUrlChange: (url: string) => void;
  onSaveEdit: (id: number, oldName: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (source: CrawlSource) => void;
  onDelete: (id: number, name: string) => void;
  onToggleCrawlImages: (id: number, crawl_images: boolean) => void;
  onTriggerCrawl: (source: CrawlSource) => void;
  onAddSource: () => void;
}

export function CrawlSourceList({
  crawlSources,
  editingId,
  editName,
  editUrl,
  crawlingId,
  crawlResult,
  newName,
  newUrl,
  adding,
  onEditNameChange,
  onEditUrlChange,
  onNewNameChange,
  onNewUrlChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onToggleCrawlImages,
  onTriggerCrawl,
  onAddSource,
}: CrawlSourceListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>爬蟲來源</CardTitle>
        <CardDescription>新增、編輯或刪除新聞爬取的網站來源</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 現有來源列表 */}
        <div className="space-y-2">
          {crawlSources.map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center gap-3 p-3 border rounded-lg"
            >
              {editingId === source.id ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                  <Input
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    placeholder="來源名稱"
                    className="w-full sm:w-[160px]"
                  />
                  <Input
                    value={editUrl}
                    onChange={(e) => onEditUrlChange(e.target.value)}
                    placeholder="網址"
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSaveEdit(source.id, source.name)}
                    >
                      儲存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCancelEdit}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm">{source.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {source.base_url}
                      </div>
                      {crawlResult?.id === source.id && (
                        <div className="text-xs mt-1">
                          <span className="text-gray-500">爬取 {crawlResult.total} 篇</span>
                          {crawlResult.saved > 0 && <span className="text-green-600">，新增 {crawlResult.saved} 篇</span>}
                          {crawlResult.duplicate > 0 && <span className="text-gray-400">，重複 {crawlResult.duplicate} 篇</span>}
                          {crawlResult.filtered > 0 && <span className="text-orange-500">，過濾 {crawlResult.filtered} 篇</span>}
                          {crawlResult.saved === 0 && crawlResult.duplicate > 0 && <span className="text-gray-400">（無新文章）</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch
                        id={`crawl-images-${source.id}`}
                        checked={source.crawl_images !== false}
                        onCheckedChange={(checked: boolean) => onToggleCrawlImages(source.id, checked)}
                      />
                      <Label htmlFor={`crawl-images-${source.id}`} className="text-xs text-gray-500 whitespace-nowrap">
                        爬圖片
                      </Label>
                    </div>
                  </div>
                  <div className="w-full flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTriggerCrawl(source)}
                      disabled={crawlingId !== null}
                    >
                      {crawlingId === source.id ? "爬取中..." : "立即爬取"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStartEdit(source)}
                    >
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => onDelete(source.id, source.name)}
                    >
                      刪除
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* 新增來源 */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 border border-dashed rounded-lg">
          <Input
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="來源名稱（例：BBC Sport）"
            className="w-full sm:w-[200px]"
          />
          <Input
            value={newUrl}
            onChange={(e) => onNewUrlChange(e.target.value)}
            placeholder="網址（例：https://www.bbc.com/sport）"
            className="flex-1"
          />
          <Button
            onClick={onAddSource}
            disabled={adding || !newName.trim() || !newUrl.trim()}
          >
            {adding ? "新增中..." : "新增"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
