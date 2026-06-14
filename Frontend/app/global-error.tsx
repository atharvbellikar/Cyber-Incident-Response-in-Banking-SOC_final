"use client";

// Top-level error boundary — catches errors in the root layout itself.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#020617", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <p style={{ color: "#f87171", fontWeight: 700, letterSpacing: 2, fontSize: 12, textTransform: "uppercase" }}>SENTRA · Fatal Error</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0" }}>The console hit an unexpected error</h1>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>The application could not render. You can try reloading.</p>
            {error?.digest && <p style={{ color: "#475569", fontFamily: "monospace", fontSize: 11 }}>ref: {error.digest}</p>}
            <button onClick={reset} style={{ marginTop: 16, background: "#06b6d4", color: "#020617", border: 0, borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
