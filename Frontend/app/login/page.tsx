"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, ShieldCheck, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

// Dynamically import the Antigravity canvas to avoid SSR errors with WebGL
const Antigravity = dynamic(
  () => import("@/components/visuals/Antigravity"),
  { ssr: false }
);

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // If already logged in, redirect
    const token = localStorage.getItem("sentra_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !password) {
      setError("All fields are required.");
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      if (mode === "register") {
        setSuccess("Account created! Logging you in…");
        // Auto-login after register
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.token) {
          localStorage.setItem("sentra_token", loginData.token);
          localStorage.setItem("sentra_user", JSON.stringify({ username: loginData.username, role: loginData.role }));
          setTimeout(() => router.push("/dashboard"), 800);
        }
      } else {
        // Login
        localStorage.setItem("sentra_token", data.token);
        localStorage.setItem("sentra_user", JSON.stringify({ username: data.username, role: data.role }));
        setSuccess(`Welcome back, ${data.username}.`);
        setTimeout(() => router.push("/dashboard"), 600);
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050b18] flex items-center justify-center">

      {/* ── Antigravity full-screen background ── */}
      <div className="absolute inset-0 z-0">
        {mounted && (
          <Antigravity
            count={420}
            magnetRadius={8}
            ringRadius={7}
            waveSpeed={0.35}
            waveAmplitude={0.9}
            particleSize={1.3}
            lerpSpeed={0.055}
            color="#38bdf8"
            autoAnimate={true}
            particleVariance={0.9}
            rotationSpeed={0.08}
            depthFactor={0.8}
            pulseSpeed={2.5}
            particleShape="capsule"
            fieldStrength={12}
          />
        )}
      </div>

      {/* ── Dark vignette overlay ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(5,11,24,0.85) 100%)",
        }}
      />

      {/* ── Grid lines ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Login Card ── */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-3xl border border-sky-500/20 bg-slate-950/70 p-8 shadow-2xl"
          style={{
            backdropFilter: "blur(24px)",
            boxShadow:
              "0 0 0 1px rgba(56,189,248,0.08), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(56,189,248,0.06) inset",
          }}
        >
          {/* Logo / Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-950/60 shadow-lg shadow-sky-500/10">
              <ShieldCheck className="h-7 w-7 text-sky-400" />
            </div>
            <h1
              className="text-2xl font-black uppercase tracking-[0.15em] text-white"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              SENTRA
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-sky-400/80">
              SOC Console · Secure Access
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6 flex rounded-xl border border-slate-700/50 bg-slate-900/60 p-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-widest transition-all duration-200 ${
                  mode === m
                    ? "bg-sky-500/20 text-sky-300 shadow-inner border border-sky-500/30"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="group">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst_01"
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
              </div>
            </div>

            {/* Password */}
            <div className="group">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-700/60 bg-slate-900/80 py-3 pl-10 pr-11 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {mode === "register" && (
              <div className="group">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-400 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700/60 bg-slate-900/80 py-3 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                  />
                </div>
              </div>
            )}

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 w-full overflow-hidden rounded-xl border border-sky-500/40 bg-sky-500/10 py-3 text-sm font-semibold text-sky-300 transition-all duration-300 hover:border-sky-400/60 hover:bg-sky-500/20 hover:shadow-lg hover:shadow-sky-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-sky-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </span>
            </button>
          </form>

          {/* Default credentials hint */}
          {mode === "login" && (
            <p className="mt-5 text-center text-[10px] text-slate-600">
              Default credentials:{" "}
              <span className="text-slate-500 font-semibold">admin</span>{" "}
              /{" "}
              <span className="text-slate-500 font-semibold">admin123</span>
            </p>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center gap-2 border-t border-slate-800 pt-5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
              Sentra Cybersecurity Platform · Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
