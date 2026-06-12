"use client";

import BorderGlow from "@/components/visuals/BorderGlow";
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

  // Base HSL values for the glow based on severity
  const glowColor =
    severity === "critical"
      ? "0 80 60"
      : severity === "high"
        ? "30 90 60"
        : severity === "medium"
          ? "45 100 50"
          : severity === "low"
            ? "150 80 50"
            : "200 90 60"; // sky default

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group w-full h-full"
    >
      <BorderGlow
        edgeSensitivity={20}
        glowColor={glowColor}
        backgroundColor="rgba(15, 23, 42, 0.6)" // semi-transparent slate-900
        borderRadius={6} // matched with rounded-md
        glowRadius={20}
        glowIntensity={highlight ? 1.5 : 0.6}
        coneSpread={25}
        animated={highlight}
        className={cn("w-full h-full", className)}
      >
        <Card
          className={cn(
            "relative overflow-hidden border-none bg-transparent transition-all duration-300 w-full h-full",
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
          <CardContent className="p-5 pt-4 leading-relaxed h-full">{children}</CardContent>
        </Card>
      </BorderGlow>
    </motion.div>
  );
}