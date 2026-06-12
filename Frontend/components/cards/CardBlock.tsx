"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn, severityTone } from "@/lib/utils";

type CardBlockProps = {
  title: string;
  tag?: string;
  severity?: string;
  children: React.ReactNode;
  highlight?: boolean;
  className?: string;
};

export default function CardBlock({ title, tag, severity, children, highlight = false, className }: CardBlockProps) {
  const highlightTone =
    severity === "critical"
      ? "border-red-500/50"
      : severity === "high"
        ? "border-orange-400/50"
        : severity === "medium"
          ? "border-yellow-400/50"
          : severity === "low"
            ? "border-emerald-400/50"
            : "border-sky-400/50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group"
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-sm border border-slate-700/50 bg-slate-900/95 transition-all duration-300",
          highlight && highlightTone,
          className,
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-slate-700/60 p-5 pb-3">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-2">
            {tag ? <Badge variant="outline">{tag}</Badge> : null}
            {severity ? <Badge className={severityTone(severity)}>{severity.toUpperCase()}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-4 leading-relaxed">{children}</CardContent>
      </Card>
    </motion.div>
  );
}