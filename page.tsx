"use client";

const X_URL = "https://x.com/StealthyPepe";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type WalletRow = { raw: string; formatted: string; ok: boolean; duplicates: number };
type ApiRes = {
  decimals: number;
  symbol: string;
  totalRaw: string;
  total: string;
  perWallet: Record<string, WalletRow>;
  uniqueCount: number;
  submittedCount: number;
  error?: string;
};

type ConfettiFn = (opts?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
}) => void;

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

export default function Page() {
  const [input, setInput] = useState("");
  const [res, setRes] = useState<ApiRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 3D tilt
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * 6;
      const ry = (0.5 - px) * 8;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    };
    const reset = () => (el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)");
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, []);

  const parsedAddresses = useMemo(
    () =>
      input
        .split(/\s|,|;|\n|\t/)
        .map((s) => s.trim())
        .filter(Boolean),
    [input]
  );

  async function onCheck() {
    setLoading(true);
    setErr(null);
    setRes(null);
    try {
      const r = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addresses: parsedAddresses }),
      });

      const j = (await r.json()) as ApiRes | { error: string };
      if (!r.ok || "error" in j) throw new Error("error" in j ? j.error : r.statusText);

      setRes(j);

      // Fireworks if total > 0
      const total = Number(j.total);
      if (total > 0) {
        const mod = await import("canvas-confetti");
        const confetti = mod.default as unknown as ConfettiFn;
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
        setTimeout(() => confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } }), 250);
        setTimeout(() => confetti({ particleCount: 120, spread: 75, origin: { y: 0.55 } }), 500);
      }
    } catch (e: unknown) {
      setErr(getErrorMessage(e) || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (s: string | number) =>
    Number(s).toLocaleString("en-US", { maximumFractionDigits: 8 });

  const IconCheck = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" stroke="#79ffa1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const IconX = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" stroke="#ff7b7b" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1400px 700px at 10% 10%, #243047 0%, transparent 60%), radial-gradient(1200px 600px at 90% 20%, #2a1f3f 0%, transparent 60%), #0b0e12",
        color: "#e8ecf1",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* subtle grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse at 50% 50%, black 40%, transparent 70%)",
        }}
      />

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "48px 20px" }}>
        {/* HEADER */}
        <section
          ref={cardRef}
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            transformStyle: "preserve-3d",
            transition: "transform .15s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            {/* logo */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6aa3ff, #b78cff)",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Image
                src="/linea.svg"
                alt="Linea"
                width={36}
                height={36}
                style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.3))" }}
                priority
              />
            </div>
            <h1 style={{ fontSize: 28, margin: 0, letterSpacing: 0.3 }}>
              Linea Airdrop Checker
            </h1>

            {/* Follow on X */}
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on X"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.06))",
                boxShadow: "0 12px 30px rgba(0,0,0,.35)",
                textDecoration: "none",
                color: "#e8ecf1",
                fontWeight: 700,
                transform: "translateZ(20px)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M18.244 2H21l-6.57 7.51L22 22h-6.81l-5.34-7.22L3.9 22H2l7.05-8.06L2 2h6.89l4.84 6.63L18.244 2Zm-1.19 18h1.83L7.02 4H5.13l11.924 16Z"
                />
              </svg>
              Follow on X
            </a>
          </div>
          <p style={{ margin: 0, color: "#b9c3cf" }}>
            Paste multiple wallet addresses (comma/space/newline separated).
            We’ll batch-query the allocation and show per-wallet amounts and the total.
          </p>
        </section>

        {/* INPUT */}
        <section
          style={{
            marginTop: 18,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 22,
            padding: 20,
          }}
        >
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: "#cdd7e1",
              fontWeight: 600,
            }}
          >
            Wallet addresses
          </label>
          <textarea
            placeholder={`0xabc...\n0xdef...\n0x123...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              height: 160,
              borderRadius: 16,
              padding: 14,
              background: "#0f1319",
              border: "1px solid #263142",
              color: "#e8ecf1",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              boxShadow: "inset 0 0 40px rgba(0,0,0,0.35)",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onCheck}
              disabled={loading || parsedAddresses.length === 0}
              style={{
                padding: "12px 18px",
                borderRadius: 14,
                border: "1px solid #3a4b63",
                background: loading
                  ? "rgba(255,255,255,0.12)"
                  : "linear-gradient(135deg, #7aa7ff, #b78cff)",
                color: "#0b0e12",
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
                boxShadow: "0 16px 40px rgba(122,167,255,0.35)",
              }}
            >
              {loading ? "Checking..." : "Check"}
            </button>
            <div style={{ marginLeft: "auto", color: "#93a0af", fontSize: 12 }}>
              {parsedAddresses.length > 0
                ? `${parsedAddresses.length} address`
                : "No addresses"}
            </div>
          </div>
          {err && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(255,99,99,0.08)",
                border: "1px solid rgba(255,99,99,0.3)",
                color: "#ffb3b3",
                fontSize: 13,
              }}
            >
              {err}
            </div>
          )}
        </section>

        {/* RESULTS */}
        {res && (
          <section
            style={{
              marginTop: 18,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 22,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #35465d",
                  color: "#b9c3cf",
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 12,
                }}
              >
                Submitted: {res.submittedCount} • Unique: {res.uniqueCount}
              </div>
              <div style={{ marginLeft: "auto", fontWeight: 800, fontSize: 18 }}>
                Total: {fmt(res.total)} {res.symbol}
              </div>
            </div>

            <div style={{ overflow: "hidden", borderRadius: 14, border: "1px solid #2d3a4e" }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                <thead style={{ background: "#0f1319" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#93a0af", fontWeight: 700 }}>Status</th>
                    <th style={{ textAlign: "left", padding: "10px 12px", fontSize: 12, color: "#93a0af", fontWeight: 700 }}>Address</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", fontSize: 12, color: "#93a0af", fontWeight: 700 }}>Amount ({res.symbol})</th>
                    <th style={{ textAlign: "center", padding: "10px 12px", fontSize: 12, color: "#93a0af", fontWeight: 700 }}>×</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(res.perWallet).map(([addr, v], idx) => (
                    <tr key={addr} style={{ background: idx % 2 === 0 ? "#0c0f14" : "#0a0d12" }}>
                      <td style={{ padding: "10px 12px" }}>
                        {v.ok ? <IconCheck /> : <IconX />}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          fontSize: 12,
                          color: "#d6dee8",
                        }}
                      >
                        {addr}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, color: "#e8ecf1" }}>
                        {fmt(v.formatted)}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        {v.duplicates > 1 ? (
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: 28,
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: "1px solid #3a4b63",
                              background: "rgba(255,255,255,0.04)",
                              fontSize: 12,
                              color: "#b9c3cf",
                            }}
                          >
                            ×{v.duplicates}
                          </span>
                        ) : (
                          <span style={{ color: "#556070" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 10, color: "#7f8c9a", fontSize: 12 }}>
              Values formatted with {res.decimals} decimals. Duplicate addresses are merged for total.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
