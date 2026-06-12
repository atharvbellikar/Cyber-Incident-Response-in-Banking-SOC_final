"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import EntryScreen from "@/components/layout/EntryScreen";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const [showEntry, setShowEntry] = useState(false);

  useEffect(() => {
    // Sentra animation disabled per user request
    setShowEntry(false);
  }, [pathname]);

  return (
    <>
      <AnimatePresence>{showEntry ? <EntryScreen /> : null}</AnimatePresence>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
