"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubmissionPayload {
  name: string;
  email: string;
  specialty: string;
  portfolio_url: string;
  introduction: string;
}

interface ApiError {
  code: string;
  message: string;
  field?: string;
}

const SPECIALTIES = [
  { value: "籃球", label: "籃球" },
  { value: "棒球", label: "棒球" },
  { value: "綜合", label: "綜合" },
];

export function SubmissionModal({ open, onOpenChange }: SubmissionModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("綜合");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: SubmissionPayload) => {
      const res = await fetch("/api/public/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const errors: ApiError[] = data.errors || [];
        const msg = errors.map((e) => e.message).join("、") || "提交失敗";
        throw new Error(msg);
      }
      return data;
    },
    onSuccess: () => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
        resetForm();
      }, 3000);
    },
  });

  function resetForm() {
    setName("");
    setEmail("");
    setSpecialty("綜合");
    setPortfolioUrl("");
    setIntroduction("");
    mutation.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mutation.isPending) return;
    mutation.mutate({
      name,
      email,
      specialty,
      portfolio_url: portfolioUrl,
      introduction,
    });
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      resetForm();
      setShowSuccess(false);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">申請成為寫手</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            填寫以下資料，我們會盡快審核您的申請。
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-base font-semibold text-foreground">
              申請已送出！
            </p>
            <p className="text-sm text-muted-foreground">
              我們會盡快審核，請留意您的 Email。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="submission-name"
                className="text-sm font-medium text-foreground"
              >
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                id="submission-name"
                placeholder="您的姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="submission-email"
                className="text-sm font-medium text-foreground"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="submission-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Specialty */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                擅長領域 <span className="text-red-500">*</span>
              </label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇領域" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Portfolio URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="submission-portfolio"
                className="text-sm font-medium text-foreground"
              >
                作品連結{" "}
                <span className="text-muted-foreground font-normal">
                  （選填）
                </span>
              </label>
              <Input
                id="submission-portfolio"
                type="url"
                placeholder="https://your-portfolio.com"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>

            {/* Introduction */}
            <div className="space-y-1.5">
              <label
                htmlFor="submission-intro"
                className="text-sm font-medium text-foreground"
              >
                自我介紹{" "}
                <span className="text-muted-foreground font-normal">
                  （選填，最多 500 字）
                </span>
              </label>
              <Textarea
                id="submission-intro"
                placeholder="簡單介紹自己的寫作經歷或對體育的熱情..."
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {introduction.length}/500
              </p>
            </div>

            {/* Error */}
            {mutation.isError && (
              <p className="text-sm text-red-500">{mutation.error.message}</p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  送出中...
                </>
              ) : (
                "送出申請"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
