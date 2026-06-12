"use client";

import { motion } from "framer-motion";

export default function EntryScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, letterSpacing: "0.12em" }}
        animate={{ opacity: 1, scale: 1, letterSpacing: "0.22em" }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="select-none text-center"
      >
        <h1 className="bg-gradient-to-r from-sky-300 via-cyan-200 to-slate-100 bg-clip-text text-5xl font-bold tracking-[0.22em] text-transparent drop-shadow-[0_0_24px_rgba(56,189,248,0.35)] md:text-7xl">
          SENTRA
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400 md:text-sm">
          Security Operations Command
        </p>
      </motion.div>
    </motion.div>
  );
}
