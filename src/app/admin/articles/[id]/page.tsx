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

const STATUS_LABEL: Record<string, string> = {
  draft: "待審核",
  approved: "已通過",
  published: "已發布",
  rejected: "已退回",
};

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
    fetch(`/api/articles/generated/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setArticle(data.article);
        setRawArticles(data.rawArticles || []);
        setEditTitle(data.article.title);
        setEditContent(data.article.content);
        setReviewerNote(data.article.reviewer_note || "");
        setSelectedChannelIds(data.article.publish_channel_ids || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch publish channels
  useEffect(() => {
    fetch("/api/settings/channels")
      .then((res) => res.json())
      .then((data) => {
        // The channels API returns an array directly
        const channelList = Array.isArray(data) ? data : data.channels || [];
        setChannels(channelList.filter((c: PublishChannel) => c.is_active));
      })
      .catch(console.error);
  }, []);

  const handleAction = async (action: "approved" | "rejected" | "save") => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};

      if (action === "save") {
        body.title = editTitle;
        body.content = editContent;
        body.reviewer_note = reviewerNote;
      } else {
        body.status = action;
        body.reviewer_note = reviewerNote;
        if (isEditing) {
          body.title = editTitle;
          body.content = editContent;
        }
      }

      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setArticle((prev) => (prev ? { ...prev, ...data.article } : prev));
        setIsEditing(false);
        if (action !== "save") {
          router.push("/admin/articles");
        }
      }
    } catch (err) {
      console.error("Action failed:", err);
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
          <Badge variant="secondary">{STATUS_LABEL[article.status]}</Badge>
          {article.writer_personas && (
            <span className="text-sm text-gray-500">
              寫手：{article.writer_personas.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isEditing && article.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                編輯
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={saving}
                onClick={() => handleAction("rejected")}
              >
                退回
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={() => handleAction("approved")}
              >
                通過審核
              </Button>
            </>
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
                onClick={() => handleAction("save")}
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
      {article.status === "approved" && article.scheduled_at && (
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

      {/* 發布選項 - 只在 approved 且未排程時顯示 */}
      {article.status === "approved" && !article.scheduled_at && (
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

            {/* 審核備註 */}
            {article.status === "draft" && (
              <>
                <Separator />
                <div>
                  <Label>審核備註</Label>
                  <Textarea
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    rows={3}
                    placeholder="可選填退回原因或修改建議..."
                  />
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
