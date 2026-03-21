"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArticleHeader } from "@/components/admin/article-detail/ArticleHeader";
import { PublishStatusCard } from "@/components/admin/article-detail/PublishStatusCard";
import { PublishOptionsCard } from "@/components/admin/article-detail/PublishOptionsCard";
import { ArticleContentCard } from "@/components/admin/article-detail/ArticleContentCard";
import { RawArticlesCard } from "@/components/admin/article-detail/RawArticlesCard";
import { CitedSourcesCard } from "@/components/admin/article-detail/CitedSourcesCard";
import { ReviewStatusCard } from "@/components/admin/article-detail/ReviewStatusCard";
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
  const queryClient = useQueryClient();

  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [, setReviewerNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Publish/schedule state
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [scheduledDateTime, setScheduledDateTime] = useState("");

  const { data: articleData, isLoading: articleLoading } = useQuery<{
    article: ArticleDetail;
    rawArticles: RawArticle[];
  }>({
    queryKey: ["article", id],
    queryFn: async () => {
      const res = await fetch(`/api/articles/generated/${id}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const { data: channelData } = useQuery<PublishChannel[]>({
    queryKey: ["active-channels"],
    queryFn: async () => {
      const res = await fetch("/api/settings/channels");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.channels || [];
      return list.filter((c: PublishChannel) => c.is_active);
    },
  });

  const article = articleData?.article ?? null;
  const rawArticles = articleData?.rawArticles ?? [];
  const channels = channelData ?? [];

  // Initialize form state when article data loads
  useEffect(() => {
    if (article) {
      setEditTitle(article.title);
      setEditContent(article.content);
      setReviewerNote(article.reviewer_note || "");
    }
  }, [article]);

  // Initialize channel selection when both article and channels load
  useEffect(() => {
    if (article && channels.length > 0) {
      const articleChannels = article.publish_channel_ids || [];
      setSelectedChannelIds(
        articleChannels.length > 0
          ? articleChannels
          : channels.map((c) => c.id)
      );
    }
  }, [article, channels]);

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/articles/generated/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("patch failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["article", id] });
    },
  });

  const handleSave = async () => {
    patchMutation.mutate(
      { title: editTitle, content: editContent },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  const handlePublishNow = async () => {
    patchMutation.mutate({
      status: "published",
      published_at: new Date().toISOString(),
      publish_channel_ids: selectedChannelIds,
    });
  };

  const handleSchedule = async () => {
    if (!scheduledDateTime) return;
    patchMutation.mutate(
      {
        scheduled_at: new Date(scheduledDateTime).toISOString(),
        publish_channel_ids: selectedChannelIds,
      },
      { onSuccess: () => setScheduledDateTime("") }
    );
  };

  const handleCancelSchedule = async () => {
    patchMutation.mutate({ scheduled_at: null });
  };

  const handleRemoveImage = async (index: number) => {
    if (!article) return;
    const newImages = article.images.filter((_, i) => i !== index);
    patchMutation.mutate({ images: newImages });
  };

  const toggleChannel = (channelId: number) => {
    setSelectedChannelIds((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  if (articleLoading) {
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
        saving={patchMutation.isPending}
        onBack={() => router.back()}
        onEdit={() => setIsEditing(true)}
        onCancelEdit={() => setIsEditing(false)}
        onSave={handleSave}
      />

      <PublishStatusCard
        article={article}
        publishing={patchMutation.isPending}
        onCancelSchedule={handleCancelSchedule}
      />

      {article.status === "draft" && !article.scheduled_at && (
        <PublishOptionsCard
          channels={channels}
          selectedChannelIds={selectedChannelIds}
          scheduledDateTime={scheduledDateTime}
          publishing={patchMutation.isPending}
          onToggleChannel={toggleChannel}
          onScheduledDateTimeChange={setScheduledDateTime}
          onPublishNow={handlePublishNow}
          onSchedule={handleSchedule}
        />
      )}

      <ReviewStatusCard
        reviewStatus={article.review_status}
        reviewResult={article.review_result}
        reviewedAt={article.reviewed_at}
        writingStrategy={article.writing_strategy}
      />

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

        <div className="space-y-6">
          <RawArticlesCard rawArticles={rawArticles} />
          <CitedSourcesCard citedSources={article.cited_sources || []} />
        </div>
      </div>
    </div>
  );
}
