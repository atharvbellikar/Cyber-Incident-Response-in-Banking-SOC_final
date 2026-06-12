"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import EntryScreen from "@/components/layout/EntryScreen";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Activity, FileWarning, UploadCloud } from "lucide-react";

import TargetCursor from "@/components/visuals/TargetCursor";
const Threads = dynamic(() => import("@/components/Threads"), { ssr: false });

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [showEntry, setShowEntry] = useState(false);

  useEffect(() => {
    // Sentra animation disabled per user request
    setShowEntry(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/login") {
      const token = localStorage.getItem("sentra_token");
      if (!token) {
        router.push("/login");
      }
    }
  }, [pathname, router]);

  // If on login page, render bare children (no shell)
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <TargetCursor 
        targetSelector="button, a, .cursor-target, .sm-panel-item, [role='button']" 
        spinDuration={3} 
        parallaxOn={true} 
      />
      <AnimatePresence>{showEntry ? <EntryScreen /> : null}</AnimatePresence>
      <div className="fixed inset-0 z-0 opacity-40">
        <Threads
          color={[0.32, 0.15, 1]}
          amplitude={1}
          distance={0}
          enableMouseInteraction={true}
        />
      </div>
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {pathname !== "/login" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-around border-t border-slate-700/60 bg-slate-950/90 p-2 md:hidden backdrop-blur">
          <Link href="/dashboard" className={`flex flex-col items-center p-2 ${pathname.startsWith('/dashboard') ? 'text-sky-400' : 'text-slate-400 hover:text-sky-300'}`}>
            <Activity className="h-5 w-5" />
            <span className="text-[10px] mt-1">SOC</span>
          </Link>
          <Link href="/upload" className={`flex flex-col items-center p-2 ${pathname.startsWith('/upload') ? 'text-sky-400' : 'text-slate-400 hover:text-sky-300'}`}>
            <UploadCloud className="h-5 w-5" />
            <span className="text-[10px] mt-1">Ingest</span>
          </Link>
        </div>
      )}
    </>
  );
}
