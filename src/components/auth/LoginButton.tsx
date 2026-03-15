"use client";

import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

/**
 * 獨立的登入按鈕（點擊打開 LoginModal）
 * 可用於任意位置的登入引導
 */
export function LoginButton({
  className,
  variant = "default",
  size = "default",
  children = "登入",
}: LoginButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <LoginModal open={open} onOpenChange={setOpen} />
    </>
  );
}
