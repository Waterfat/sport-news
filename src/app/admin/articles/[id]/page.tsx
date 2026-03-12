"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArticleHeader } from "@/components/admin/article-detail/ArticleHeader";
import { PublishStatusCard } from "@/components/admin/article-detail/PublishStatusCard";
import { PublishOptionsCard } from "@/components/admin/article-detail/PublishOptionsCard";
import { ArticleContentCard } from "@/components/admin/article-detail/ArticleContentCard";
import { RawArticlesCard } from "@/components/admin/article-detail/RawArticlesCard";
import type {
  ArticleDetail,
  RawArticle,
  PublishChannel,
} from "@/components/admin/article-detail/article-detail-types";

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
  const [, setReviewerNote] = useState("");
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
      <ArticleHeader
        article={article}
        isEditing={isEditing}
        saving={saving}
        onBack={() => router.back()}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onSave={handleSave}
      />

      <PublishStatusCard
        article={article}
        publishing={publishing}
        onCancelSchedule={handleCancelSchedule}
      />

      {article.status === "draft" && !article.scheduled_at && (
        <PublishOptionsCard
          channels={channels}
          selectedChannelIds={selectedChannelIds}
          scheduledDateTime={scheduledDateTime}
          publishing={publishing}
          onToggleChannel={toggleChannel}
          onScheduledDateTimeChange={setScheduledDateTime}
          onPublishNow={handlePublishNow}
          onSchedule={handleSchedule}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleContentCard
          article={article}
          isEditing={isEditing}
          editTitle={editTitle}
          editContent={editContent}
          onEditTitleChange={setEditTitle}
          onEditContentChange={setEditContent}
          onRemoveImage={handleRemoveImage}
        />

        <RawArticlesCard rawArticles={rawArticles} />
      </div>
    </div>
  );
}
