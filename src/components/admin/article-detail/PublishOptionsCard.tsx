"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { PublishChannel } from "./article-detail-types";

interface PublishOptionsCardProps {
  channels: PublishChannel[];
  selectedChannelIds: number[];
  scheduledDateTime: string;
  publishing: boolean;
  onToggleChannel: (channelId: number) => void;
  onScheduledDateTimeChange: (value: string) => void;
  onPublishNow: () => void;
  onSchedule: () => void;
}

export function PublishOptionsCard({
  channels,
  selectedChannelIds,
  scheduledDateTime,
  publishing,
  onToggleChannel,
  onScheduledDateTimeChange,
  onPublishNow,
  onSchedule,
}: PublishOptionsCardProps) {
  return (
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
                    onCheckedChange={() => onToggleChannel(channel.id)}
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
          <Button disabled={publishing} onClick={onPublishNow}>
            {publishing ? "處理中..." : "直接發布"}
          </Button>

          {/* 排程發布 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => onScheduledDateTimeChange(e.target.value)}
              className="w-full sm:w-auto"
              min={new Date().toISOString().slice(0, 16)}
            />
            <Button
              variant="outline"
              disabled={publishing || !scheduledDateTime}
              onClick={onSchedule}
            >
              排程發布
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
