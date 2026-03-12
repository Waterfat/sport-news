"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ARTICLE_STATUS_LABELS } from "@/lib/constants";

interface ArticleDetail {
  id: string;
  title: string;
  content: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  publish_channel_ids: number[];
  images: string[];
  writer_personas: {
    name: string;
    description: string | null;
  } | null;
}

interface RawArticle {
  id: string;
  source: string;
  title: string;
  content: string;
  url: string;
}

interface PublishChannel {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}


export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [rawArticles, setRawArticles] = useState<RawArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Publish/schedule state
  const [channels, setChannels] = useState<PublishChannel[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/articles/generated/${id}`).then((res) => res.json()),
      fetch("/api/settings/channels").then((res) => res.json()),
    ])
      .then(([articleData, channelData]) => {
        setArticle(articleData.article);
        setRawArticles(articleData.rawArticles || []);
        setEditTitle(articleData.article.title);
        setEditContent(articleData.article.content);
        setReviewerNote(articleData.article.reviewer_note || "");

        const channelList = Array.isArray(channelData) ? channelData : channelData.channels || [];
        const activeChannels = channelList.filter((c: PublishChannel) => c.is_active);
        setChannels(activeChannels);

        // 文章有指定頻道就用，沒有就預設全選
        const articleChannels = articleData.article.publish_channel_ids || [];
        setSelectedChannelIds(
          articleChannels.length > 0
            ? articleChannels
            : activeChannels.map((c: PublishChannel) => c.id)
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => (prev ? { ...prev, ...data.article } : prev));
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "published",
          published_at: new Date().toISOString(),
          publish_channel_ids: selectedChannelIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => (prev ? { ...prev, ...data.article } : prev));
      }
    } catch (err) {
      console.error("Publish failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDateTime) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(scheduledDateTime).toISOString(),
          publish_channel_ids: selectedChannelIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => (prev ? { ...prev, ...data.article } : prev));
        setScheduledDateTime("");
      }
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelSchedule = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => (prev ? { ...prev, ...data.article } : prev));
      }
    } catch (err) {
      console.error("Cancel schedule failed:", err);
    } finally {
      setPublishing(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (!article) return;
    const newImages = article.images.filter((_, i) => i !== index);
    try {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages }),
      });
      if (res.ok) {
        setArticle((prev) => prev ? { ...prev, images: newImages } : prev);
      }
    } catch (err) {
      console.error("Remove image failed:", err);
    }
  };

  const toggleChannel = (channelId: number) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (!article) {
    return <div className="text-center py-12 text-red-500">文章不存在</div>;
  }

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            返回
          </Button>
          <Badge variant="secondary">{ARTICLE_STATUS_LABELS[article.status]}</Badge>
          {article.writer_personas && (
            <span className="text-sm text-gray-500">
              寫手：{article.writer_personas.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing && article.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              編輯
            </Button>
          )}
          {isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSave}
              >
                儲存修改
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 已發布資訊 */}
      {article.status === "published" && article.published_at && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                已發布
              </Badge>
              <span className="text-gray-600">
                發布時間：{new Date(article.published_at).toLocaleString("zh-TW")}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 排程資訊 */}
      {article.status === "draft" && article.scheduled_at && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  排程中
                </Badge>
                <span className="text-gray-600">
                  預定發布時間：{new Date(article.scheduled_at).toLocaleString("zh-TW")}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={publishing}
                onClick={handleCancelSchedule}
              >
                取消排程
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 發布選項 - 未發布且未排程時顯示 */}
      {article.status === "draft" && !article.scheduled_at && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">發布選項</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 頻道選擇 */}
            {channels.length > 0 && (
              <div className="space-y-2">
                <Label>發布頻道</Label>
                <div className="flex flex-wrap gap-4">
                  {channels.map((channel) => (
                    <div key={channel.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`channel-${channel.id}`}
                        checked={selectedChannelIds.includes(channel.id)}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                      <Label
                        htmlFor={`channel-${channel.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {channel.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="flex flex-col sm:flex-row gap-4">
              {/* 直接發布 */}
              <Button
                disabled={publishing}
                onClick={handlePublishNow}
              >
                {publishing ? "處理中..." : "直接發布"}
              </Button>

              {/* 排程發布 */}
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-auto"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <Button
                  variant="outline"
                  disabled={publishing || !scheduledDateTime}
                  onClick={handleSchedule}
                >
                  排程發布
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：改寫後文章 */}
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
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>內文</Label>
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
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
                            onClick={() => handleRemoveImage(i)}
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

        {/* 右側：參考來源 */}
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
      </div>
    </div>
  );
}
