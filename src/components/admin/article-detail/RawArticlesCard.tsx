"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { RawArticle } from "./article-detail-types";

interface RawArticlesCardProps {
  rawArticles: RawArticle[];
}

export function RawArticlesCard({ rawArticles }: RawArticlesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          參考來源（{rawArticles.length} 篇）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rawArticles.length === 0 ? (
          <p className="text-gray-500">無關聯來源</p>
        ) : (
          rawArticles.map((raw) => (
            <div key={raw.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{raw.source}</Badge>
                <a
                  href={raw.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  原始連結
                </a>
              </div>
              <h3 className="font-semibold text-sm">{raw.title}</h3>
              <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                {raw.content.substring(0, 500)}
                {raw.content.length > 500 && "..."}
              </div>
              <Separator />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
