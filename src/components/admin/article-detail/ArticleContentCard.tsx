"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ArticleDetail } from "./article-detail-types";

interface ArticleContentCardProps {
  article: ArticleDetail;
  isEditing: boolean;
  editTitle: string;
  editContent: string;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onRemoveImage: (index: number) => void;
}

export function ArticleContentCard({
  article,
  isEditing,
  editTitle,
  editContent,
  onEditTitleChange,
  onEditContentChange,
  onRemoveImage,
}: ArticleContentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">改寫文章</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label>標題</Label>
              <Input
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
              />
            </div>
            <div>
              <Label>內文</Label>
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold">{article.title}</h2>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {article.content}
            </div>
          </>
        )}

        {/* 附圖 */}
        {article.images?.length > 0 && (
          <>
            <Separator />
            <div>
              <Label>附圖 ({article.images.length})</Label>
              <div className="flex gap-3 mt-2 flex-wrap">
                {article.images.map((img, i) => {
                  const url = typeof img === "string" ? img : (img as unknown as { url: string }).url;
                  return (
                    <div key={i} className="relative group">
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`圖片 ${i + 1}`}
                          className="w-32 h-24 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                      <button
                        onClick={() => onRemoveImage(i)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
