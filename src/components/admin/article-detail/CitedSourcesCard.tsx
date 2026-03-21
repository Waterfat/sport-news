"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { CitedSource } from "./article-detail-types";

const sourceTypeLabels: Record<string, string> = {
  raw_article: "原始文章",
  web_search: "網路搜尋",
  social: "社群媒體",
};

interface CitedSourcesCardProps {
  citedSources: CitedSource[];
}

export function CitedSourcesCard({ citedSources }: CitedSourcesCardProps) {
  if (!citedSources || citedSources.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">引用來源</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {citedSources.map((source, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <Badge variant="outline" className="shrink-0 mt-0.5">
                {sourceTypeLabels[source.type] || source.type}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{source.title}</p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate max-w-[300px]">{source.url}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
