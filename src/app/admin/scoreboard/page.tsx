"use client";

import { useState, useEffect, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SPORT_KEY_LABELS } from "@/lib/constants";

interface ScoreboardConfig {
  id: number;
  sport_key: string;
  league_key: string;
  label: string;
  espn_endpoint: string;
  enabled: boolean;
  sort_order: number;
}

const EMPTY_FORM = {
  sport_key: "",
  league_key: "",
  label: "",
  espn_endpoint: "",
  sort_order: 0,
};

export default function AdminScoreboardPage() {
  const [configs, setConfigs] = useState<ScoreboardConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/scoreboard");
      if (res.ok) {
        const json = await res.json();
        setConfigs(json.configs ?? []);
      }
    } catch (err) {
      console.error("Fetch scoreboard configs error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  async function handleToggle(config: ScoreboardConfig) {
    try {
      const res = await fetch("/api/settings/scoreboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, enabled: !config.enabled }),
      });
      if (res.ok) {
        setConfigs((prev) =>
          prev.map((c) =>
            c.id === config.id ? { ...c, enabled: !c.enabled } : c
          )
        );
      } else {
        alert("更新失敗");
      }
    } catch {
      alert("更新失敗");
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(config: ScoreboardConfig) {
    setEditingId(config.id);
    setForm({
      sport_key: config.sport_key,
      league_key: config.league_key,
      label: config.label,
      espn_endpoint: config.espn_endpoint,
      sort_order: config.sort_order,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const method = editingId ? "PUT" : "POST";
    const payload = editingId ? { id: editingId, ...form } : form;

    try {
      const res = await fetch("/api/settings/scoreboard", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchConfigs();
      } else {
        const json = await res.json();
        alert(json.error || "儲存失敗");
      }
    } catch {
      alert("儲存失敗");
    }
  }

  async function handleDelete() {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch("/api/settings/scoreboard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirmId }),
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchConfigs();
      } else {
        alert("刪除失敗");
      }
    } catch {
      alert("刪除失敗");
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    handleSave();
  }

  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">即時比分設定</h1>
        <Button onClick={openCreate}>+ 新增比分來源</Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">載入中...</div>
      ) : configs.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          尚無比分來源設定
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">排序</TableHead>
                <TableHead>聯賽</TableHead>
                <TableHead>ESPN Endpoint</TableHead>
                <TableHead>球種</TableHead>
                <TableHead className="w-20">啟用</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="text-center">{config.sort_order}</TableCell>
                  <TableCell className="font-medium">{config.label}</TableCell>
                  <TableCell className="text-sm text-slate-500 font-mono">
                    {config.espn_endpoint}
                  </TableCell>
                  <TableCell>
                    {SPORT_KEY_LABELS[config.sport_key] ?? config.sport_key}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={() => handleToggle(config)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(config)}
                      >
                        編輯
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteConfirmId(config.id)}
                      >
                        刪除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "編輯比分來源" : "新增比分來源"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="sport_key">球種 Key</Label>
                <Input
                  id="sport_key"
                  placeholder="例：basketball, baseball, soccer"
                  value={form.sport_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sport_key: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="league_key">聯賽 Key（唯一值）</Label>
                <Input
                  id="league_key"
                  placeholder="例：nba, mlb, epl"
                  value={form.league_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, league_key: e.target.value }))
                  }
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label htmlFor="label">顯示名稱</Label>
                <Input
                  id="label"
                  placeholder="例：NBA"
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="espn_endpoint">ESPN Endpoint</Label>
                <Input
                  id="espn_endpoint"
                  placeholder="例：basketball/nba"
                  value={form.espn_endpoint}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, espn_endpoint: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="sort_order">排序</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-slate-600">
            確定要刪除此比分來源嗎？此操作無法復原。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
