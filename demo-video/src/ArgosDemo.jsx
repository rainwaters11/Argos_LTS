import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// ─── Color Palette ───
const COLORS = {
  bg: "#0a0e1a",
  bgGrad: "#111827",
  accent: "#00d4ff",
  accentAlt: "#7c3aed",
  green: "#10b981",
  red: "#ef4444",
  amber: "#f59e0b",
  white: "#f8fafc",
  muted: "#94a3b8",
  card: "rgba(30, 41, 59, 0.7)",
  border: "rgba(100, 116, 139, 0.3)",
};

// ─── Scene 1: Title Card ───
const TitleScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(frame, [0, 30], [60, 0], { extrapolateRight: "clamp" });
  const titleOp = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOp = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const badgeScale = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const glowPulse = interpolate(frame, [0, 60, 120], [0.3, 0.8, 0.3], { extrapolateRight: "extend" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${COLORS.bgGrad}, ${COLORS.bg})`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Animated glow */}
      <div style={{
        position: "absolute",
        width: 500, height: 500,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,212,255,${glowPulse * 0.15}), transparent 70%)`,
        top: "15%", left: "35%",
      }} />

      <div style={{ textAlign: "center", transform: `translateY(${titleY}px)`, opacity: titleOp }}>
        <div style={{ fontSize: 28, color: COLORS.accent, letterSpacing: 6, marginBottom: 16, fontWeight: 600 }}>
          ◈ INTRODUCING
        </div>
        <h1 style={{
          fontSize: 120, fontWeight: 900, color: COLORS.white, margin: 0, lineHeight: 1,
          background: `linear-gradient(135deg, ${COLORS.white}, ${COLORS.accent})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          ARGOS
        </h1>
      </div>

      <div style={{ opacity: subtitleOp, textAlign: "center", marginTop: 30 }}>
        <p style={{ fontSize: 32, color: COLORS.muted, margin: 0, fontWeight: 300 }}>
          Intelligent MEV Protection for Uniswap v4
        </p>
      </div>

      <div style={{
        display: "flex", gap: 20, marginTop: 50,
        transform: `scale(${badgeScale})`, opacity: badgeScale,
      }}>
        {["Uniswap v4 Hook", "Reactive Network", "Unichain"].map((label, i) => (
          <div key={i} style={{
            padding: "12px 28px", borderRadius: 50,
            border: `1px solid ${COLORS.accent}40`,
            background: `${COLORS.accent}10`,
            color: COLORS.accent, fontSize: 18, fontWeight: 600,
          }}>
            {label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 2: The Problem ───
const ProblemScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const items = [
    { icon: "🐋", label: "Whale Dumps", desc: "Large token sales crash LST prices", delay: 15 },
    { icon: "🤖", label: "MEV Extraction", desc: "Sandwich attacks exploit price movement", delay: 30 },
    { icon: "💀", label: "Toxic Flow", desc: "LPs lose value to informed adversaries", delay: 45 },
  ];

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${COLORS.bg}, #1a0a0a)`,
      justifyContent: "center", alignItems: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ opacity: headOp, textAlign: "center", marginBottom: 60 }}>
        <h2 style={{ fontSize: 64, color: COLORS.red, fontWeight: 800, margin: 0 }}>
          ⚠ The Problem
        </h2>
        <p style={{ fontSize: 26, color: COLORS.muted, marginTop: 12 }}>
          LST pools are vulnerable to toxic flow
        </p>
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        {items.map((item, i) => {
          const s = spring({ frame: frame - item.delay, fps, config: { damping: 12 } });
          return (
            <div key={i} style={{
              width: 320, padding: "40px 30px", borderRadius: 20,
              background: COLORS.card, border: `1px solid ${COLORS.red}30`,
              textAlign: "center", transform: `scale(${s})`, opacity: s,
            }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>{item.icon}</div>
              <h3 style={{ fontSize: 28, color: COLORS.white, marginBottom: 10 }}>{item.label}</h3>
              <p style={{ fontSize: 18, color: COLORS.muted, lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: The Solution — beforeSwap Sentry ───
const SolutionScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const states = [
    { label: "SAFE", color: COLORS.green, icon: "✅", desc: "Swaps pass through normally", delay: 20 },
    { label: "RESTRICTED", color: COLORS.amber, icon: "⚡", desc: "Swaps capped at maxAbsAmount", delay: 40 },
    { label: "BLOCKED", color: COLORS.red, icon: "🛑", desc: "All swaps reverted", delay: 60 },
  ];

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 80%, #0a1a2a, ${COLORS.bg})`,
      justifyContent: "center", alignItems: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ opacity: headOp, textAlign: "center", marginBottom: 50 }}>
        <h2 style={{ fontSize: 60, color: COLORS.accent, fontWeight: 800, margin: 0 }}>
          🛡 The Sentry: beforeSwap
        </h2>
        <p style={{ fontSize: 24, color: COLORS.muted, marginTop: 12 }}>
          Risk-state enforcement at the hook level
        </p>
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        {states.map((s, i) => {
          const sc = spring({ frame: frame - s.delay, fps, config: { damping: 12 } });
          return (
            <div key={i} style={{
              width: 330, padding: "40px 30px", borderRadius: 20,
              background: COLORS.card, border: `2px solid ${s.color}60`,
              textAlign: "center", transform: `scale(${sc})`, opacity: sc,
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{s.icon}</div>
              <div style={{
                display: "inline-block", padding: "6px 20px", borderRadius: 30,
                background: `${s.color}20`, color: s.color,
                fontSize: 22, fontWeight: 700, marginBottom: 16,
              }}>
                {s.label}
              </div>
              <p style={{ fontSize: 20, color: COLORS.muted, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 50, opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <code style={{
          fontSize: 22, color: COLORS.accent, background: `${COLORS.accent}10`,
          padding: "10px 24px", borderRadius: 10, border: `1px solid ${COLORS.accent}30`,
        }}>
          beforeSwapReturnDelta: true → Custom Accounting Enabled
        </code>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Smart Parking (ERC-6909) ───
const ParkingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const steps = [
    { num: "1", label: "Swap Arrives", desc: "Exact-input swap detected during high-gas", color: COLORS.accent, delay: 20 },
    { num: "2", label: "Mint Claim", desc: "poolManager.mint() issues ERC-6909 token", color: COLORS.accentAlt, delay: 40 },
    { num: "3", label: "Park Intent", desc: "Trade stored as ParkedIntent struct", color: COLORS.amber, delay: 60 },
    { num: "4", label: "Return Delta", desc: "toBeforeSwapDelta() balances accounting", color: COLORS.green, delay: 80 },
  ];

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 30% 50%, #0f1b2d, ${COLORS.bg})`,
      justifyContent: "center", alignItems: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ opacity: headOp, textAlign: "center", marginBottom: 50 }}>
        <h2 style={{ fontSize: 56, color: COLORS.accentAlt, fontWeight: 800, margin: 0 }}>
          🅿 Smart Parking: Custom Accounting
        </h2>
        <p style={{ fontSize: 24, color: COLORS.muted, marginTop: 12 }}>
          Park-and-settle flow using ERC-6909 claims
        </p>
      </div>

      <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
        {steps.map((step, i) => {
          const sc = spring({ frame: frame - step.delay, fps, config: { damping: 14 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                width: 260, padding: "30px 24px", borderRadius: 18,
                background: COLORS.card, border: `1px solid ${step.color}40`,
                textAlign: "center", transform: `scale(${sc})`, opacity: sc,
              }}>
                <div style={{
                  width: 48, height: 48, lineHeight: "48px", borderRadius: "50%",
                  background: `${step.color}20`, color: step.color,
                  fontSize: 24, fontWeight: 800, margin: "0 auto 14px",
                }}>
                  {step.num}
                </div>
                <h4 style={{ fontSize: 22, color: COLORS.white, marginBottom: 8 }}>{step.label}</h4>
                <p style={{ fontSize: 16, color: COLORS.muted, lineHeight: 1.4 }}>{step.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  fontSize: 30, color: `${COLORS.accent}60`, margin: "0 4px",
                  opacity: sc,
                }}>→</div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5 [NEW]: Park vs Hard Revert ───
const ParkVsRevertScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Swap token flies in on both sides from frame 20
  const swapX_L = interpolate(frame, [20, 50], [-120, 460], { extrapolateRight: "clamp" });
  const swapX_R = interpolate(frame, [20, 50], [-120, 460], { extrapolateRight: "clamp" });
  const swapOp  = interpolate(frame, [20, 35], [0, 1],    { extrapolateRight: "clamp" });

  // LEFT: revert flash at frame 60
  const revertFlash = frame >= 58 && frame <= 75
    ? interpolate(frame, [58, 62, 75], [0, 1, 0.4], { extrapolateRight: "clamp" }) : 0;
  const xScale = frame >= 58 ? spring({ frame: frame - 58, fps, config: { damping: 10 } }) : 0;

  // RIGHT: park glow at frame 60
  const parkGlow = frame >= 58 ? spring({ frame: frame - 58, fps, config: { damping: 10 } }) : 0;
  const claimBadge = frame >= 72 ? spring({ frame: frame - 72, fps, config: { damping: 12 } }) : 0;

  // Bottom labels
  const label1 = frame >= 80 ? spring({ frame: frame - 80, fps, config: { damping: 14 } }) : 0;
  const label2 = frame >= 90 ? spring({ frame: frame - 90, fps, config: { damping: 14 } }) : 0;
  const label3 = frame >= 100 ? spring({ frame: frame - 100, fps, config: { damping: 14 } }) : 0;

  const dividerOp = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 20%, #12121f, ${COLORS.bg})`,
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      {/* Red flash overlay on left side */}
      {revertFlash > 0 && (
        <div style={{
          position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
          background: `rgba(239,68,68,${revertFlash * 0.25})`,
          pointerEvents: "none", zIndex: 5,
        }} />
      )}

      {/* Title */}
      <div style={{ position: "absolute", top: 40, width: "100%", textAlign: "center", opacity: headOp }}>
        <h2 style={{ fontSize: 52, color: COLORS.white, fontWeight: 800, margin: 0 }}>
          The Key Upgrade: <span style={{ color: COLORS.accentAlt }}>PARK</span> vs <span style={{ color: COLORS.red }}>REVERT</span>
        </h2>
        <p style={{ fontSize: 22, color: COLORS.muted, marginTop: 8 }}>
          No more wasted gas or failed transactions for legitimate users
        </p>
      </div>

      {/* Center divider */}
      <div style={{
        position: "absolute", left: "50%", top: 120, bottom: 0, width: 2,
        background: `linear-gradient(to bottom, ${COLORS.border}, transparent)`,
        opacity: dividerOp,
      }} />

      {/* ─── LEFT SIDE: Hard Revert (v1) ─── */}
      <div style={{
        position: "absolute", left: 0, top: 120, width: "50%", height: "calc(100% - 120px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 60px",
      }}>
        <div style={{
          fontSize: 18, color: COLORS.red, fontWeight: 700, letterSpacing: 3,
          marginBottom: 24, opacity: headOp,
          background: `${COLORS.red}15`, padding: "6px 20px", borderRadius: 20,
          border: `1px solid ${COLORS.red}40`,
        }}>v1 — HARD REVERT</div>

        {/* Swap token */}
        <div style={{
          transform: `translateX(${swapX_L - 460}px)`,
          opacity: swapOp, fontSize: 48, marginBottom: 20,
        }}>💸</div>

        {/* Revert X */}
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: xScale > 0 ? `radial-gradient(circle, ${COLORS.red}30, transparent)` : "transparent",
          border: xScale > 0 ? `3px solid ${COLORS.red}` : `3px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 80, transform: `scale(${Math.max(0.3, xScale)})`,
          boxShadow: revertFlash > 0 ? `0 0 ${40 * revertFlash}px ${COLORS.red}60` : "none",
        }}>
          {xScale > 0.3 ? "✗" : "→"}
        </div>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          {[{t:"❌ Transaction Reverted", c:COLORS.red, d:label1},
            {t:"⛽ Gas Wasted", c:COLORS.amber, d:label2},
            {t:"😤 User Must Retry", c:COLORS.muted, d:label3}].map((l, i) => (
            <div key={i} style={{
              fontSize: 20, color: l.c, marginBottom: 10,
              opacity: l.d, transform: `translateY(${interpolate(l.d, [0,1],[12,0])}px)`,
            }}>{l.t}</div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT SIDE: PARK Mode (v2) ─── */}
      <div style={{
        position: "absolute", right: 0, top: 120, width: "50%", height: "calc(100% - 120px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 60px",
      }}>
        <div style={{
          fontSize: 18, color: COLORS.green, fontWeight: 700, letterSpacing: 3,
          marginBottom: 24, opacity: headOp,
          background: `${COLORS.green}15`, padding: "6px 20px", borderRadius: 20,
          border: `1px solid ${COLORS.green}40`,
        }}>v2 — PARK MODE ✓</div>

        {/* Swap token */}
        <div style={{
          transform: `translateX(${swapX_R - 460}px)`,
          opacity: swapOp, fontSize: 48, marginBottom: 20,
        }}>💸</div>

        {/* Parking vault */}
        <div style={{
          width: 160, height: 160, borderRadius: 24,
          background: parkGlow > 0
            ? `radial-gradient(circle, ${COLORS.accentAlt}35, ${COLORS.card})`
            : COLORS.card,
          border: parkGlow > 0
            ? `3px solid ${COLORS.accentAlt}`
            : `3px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 70, transform: `scale(${Math.max(0.3, parkGlow)})`,
          boxShadow: parkGlow > 0 ? `0 0 ${30 * parkGlow}px ${COLORS.accentAlt}50` : "none",
        }}>🅿️</div>

        {/* ERC-6909 claim badge */}
        <div style={{
          marginTop: 20,
          opacity: claimBadge, transform: `scale(${claimBadge})`,
          background: `${COLORS.accentAlt}20`, border: `1px solid ${COLORS.accentAlt}60`,
          padding: "8px 24px", borderRadius: 12, fontSize: 18,
          color: COLORS.accentAlt, fontWeight: 700,
        }}>ERC-6909 Claim Minted ✓</div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          {[{t:"✅ Tx Settles Cleanly", c:COLORS.green, d:label1},
            {t:"🔐 Tokens Safe On-Chain", c:COLORS.accent, d:label2},
            {t:"♻️ Redeemable Anytime", c:COLORS.muted, d:label3}].map((l, i) => (
            <div key={i} style={{
              fontSize: 20, color: l.c, marginBottom: 10,
              opacity: l.d, transform: `translateY(${interpolate(l.d, [0,1],[12,0])}px)`,
            }}>{l.t}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6 [NEW]: Lit Protocol Redemption Gate ───
const LitGateScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Claim token appears
  const claimIn = spring({ frame: frame - 10, fps, config: { damping: 12 } });

  // Arrow 1: Claim → Lit TEE (frame 30)
  const arrow1 = frame >= 30 ? interpolate(frame, [30, 55], [0, 1], { extrapolateRight: "clamp" }) : 0;

  // Lit TEE node appears
  const litIn = frame >= 50 ? spring({ frame: frame - 50, fps, config: { damping: 12 } }) : 0;

  // On-chain read animation inside TEE
  const readPulse = frame >= 55 ? interpolate(frame % 20, [0, 10, 20], [0.4, 1, 0.4]) : 0;

  // Condition check
  const checkIn = frame >= 65 ? spring({ frame: frame - 65, fps, config: { damping: 14 } }) : 0;
  const checkPass = frame >= 78;
  const checkColor = checkPass ? COLORS.green : COLORS.amber;

  // Arrow 2: Lit TEE → Signature (frame 80)
  const arrow2 = frame >= 80 ? interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }) : 0;

  // PKP signature
  const sigIn = frame >= 95 ? spring({ frame: frame - 95, fps, config: { damping: 12 } }) : 0;

  // Arrow 3: Signature → Redeem (frame 100)
  const arrow3 = frame >= 103 ? interpolate(frame, [103, 115], [0, 1], { extrapolateRight: "clamp" }) : 0;

  // Redemption complete
  const redeemIn = frame >= 110 ? spring({ frame: frame - 110, fps, config: { damping: 10 } }) : 0;
  const redeemGlow = redeemIn;

  const nodeStyle = (color, scale) => ({
    width: 180, height: 180, borderRadius: 24,
    background: `radial-gradient(circle, ${color}25, ${COLORS.card})`,
    border: `2px solid ${color}70`,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    transform: `scale(${scale})`, opacity: scale,
    boxShadow: scale > 0.5 ? `0 0 ${20 * scale}px ${color}30` : "none",
  });

  const ArrowLine = ({ progress, color }) => (
    <div style={{
      width: 100, height: 3,
      background: `linear-gradient(to right, ${color}, transparent)`,
      clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
      alignSelf: "center", margin: "0 8px",
      opacity: progress > 0 ? 1 : 0,
    }}>
      <div style={{
        position: "absolute", right: -10,
        fontSize: 18, color, marginTop: -10,
        opacity: progress > 0.8 ? 1 : 0,
      }}>▶</div>
    </div>
  );

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 60%, #0d0a2a, ${COLORS.bg})`,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Title */}
      <div style={{ position: "absolute", top: 40, width: "100%", textAlign: "center", opacity: headOp }}>
        <h2 style={{ fontSize: 52, color: COLORS.accentAlt, fontWeight: 800, margin: 0 }}>
          🔐 Lit Protocol Redemption Gate
        </h2>
        <p style={{ fontSize: 22, color: COLORS.muted, marginTop: 8 }}>
          Decentralized access control — no server owns this gate
        </p>
      </div>

      {/* Flow row */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex", alignItems: "center", gap: 0,
      }}>

        {/* Node 1: Parked Claim */}
        <div style={nodeStyle(COLORS.accentAlt, claimIn)}>
          <div style={{ fontSize: 52 }}>🅿️</div>
          <div style={{ fontSize: 16, color: COLORS.white, fontWeight: 700, marginTop: 8, textAlign: "center" }}>
            Parked<br/>ERC-6909
          </div>
        </div>

        {/* Arrow 1 */}
        <ArrowLine progress={arrow1} color={COLORS.accent} />

        {/* Node 2: Lit TEE */}
        <div style={{
          ...nodeStyle(COLORS.accentAlt, litIn),
          width: 220, height: 220,
          position: "relative",
        }}>
          {/* Pulsing ring inside TEE */}
          {litIn > 0.3 && (
            <div style={{
              position: "absolute",
              width: 200, height: 200, borderRadius: "50%",
              border: `2px solid rgba(124,58,237,${readPulse})`,
              top: 10, left: 10,
            }} />
          )}
          <div style={{ fontSize: 52 }}>👁</div>
          <div style={{ fontSize: 15, color: COLORS.accentAlt, fontWeight: 700, marginTop: 6, textAlign: "center" }}>
            Lit Protocol TEE<br/>
            <span style={{ fontSize: 12, color: COLORS.muted, fontWeight: 400 }}>
              reads toxicExpiry(user)
            </span>
          </div>
        </div>

        {/* Condition Check Badge */}
        <div style={{
          position: "absolute",
          top: -80,
          left: "50%",
          transform: "translateX(-50%)",
          opacity: checkIn, scale: checkIn,
        }}>
          <div style={{
            padding: "10px 24px", borderRadius: 12,
            background: `${checkColor}15`,
            border: `2px solid ${checkColor}`,
            fontSize: 18, fontWeight: 700, color: checkColor,
            whiteSpace: "nowrap",
          }}>
            {checkPass ? "✅ Window Elapsed — Eligible" : "⏳ Checking 5min window…"}
          </div>
        </div>

        {/* Arrow 2 */}
        <ArrowLine progress={arrow2} color={COLORS.green} />

        {/* Node 3: PKP Signature */}
        <div style={nodeStyle(COLORS.green, sigIn)}>
          <div style={{ fontSize: 52 }}>🔏</div>
          <div style={{ fontSize: 16, color: COLORS.white, fontWeight: 700, marginTop: 8, textAlign: "center" }}>
            PKP<br/>Threshold Sig
          </div>
        </div>

        {/* Arrow 3 */}
        <ArrowLine progress={arrow3} color={COLORS.accent} />

        {/* Node 4: Redemption */}
        <div style={{
          ...nodeStyle(COLORS.accent, redeemIn),
          boxShadow: redeemGlow > 0.5 ? `0 0 ${40 * redeemGlow}px ${COLORS.accent}50` : "none",
        }}>
          <div style={{ fontSize: 52 }}>💎</div>
          <div style={{ fontSize: 16, color: COLORS.white, fontWeight: 700, marginTop: 8, textAlign: "center" }}>
            Tokens<br/>Redeemed ✓
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div style={{
        position: "absolute", bottom: 50, width: "100%", textAlign: "center",
        opacity: interpolate(frame, [108, 118], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <code style={{
          fontSize: 19, color: COLORS.accentAlt,
          background: `${COLORS.accentAlt}10`,
          padding: "10px 28px", borderRadius: 10,
          border: `1px solid ${COLORS.accentAlt}30`,
        }}>
          Lit Action published to IPFS · Runs in distributed TEE · No server required
        </code>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 7: Reactive Sentry Pulse ───
const ReactiveSentryScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Radar pulse rings
  const pulse1 = interpolate(frame % 60, [0, 60], [0.3, 1.8], { extrapolateRight: "clamp" });
  const pulse1Op = interpolate(frame % 60, [0, 60], [0.6, 0], { extrapolateRight: "clamp" });
  const pulse2 = interpolate((frame + 20) % 60, [0, 60], [0.3, 1.8], { extrapolateRight: "clamp" });
  const pulse2Op = interpolate((frame + 20) % 60, [0, 60], [0.6, 0], { extrapolateRight: "clamp" });
  const pulse3 = interpolate((frame + 40) % 60, [0, 60], [0.3, 1.8], { extrapolateRight: "clamp" });
  const pulse3Op = interpolate((frame + 40) % 60, [0, 60], [0.6, 0], { extrapolateRight: "clamp" });

  // L1 blocks scrolling
  const blockScroll = interpolate(frame, [0, 150], [0, -900], { extrapolateRight: "extend" });

  // Whale detection flash at frame 50
  const whaleDetected = frame >= 50;
  const whaleFlash = whaleDetected ? interpolate(frame, [50, 60, 70], [0, 1, 0.7], { extrapolateRight: "clamp" }) : 0;

  // Lightning bolt travels from left (sentry) to right (hook) starting at frame 65
  const boltProgress = frame >= 65 ? interpolate(frame, [65, 100], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const boltX = interpolate(boltProgress, [0, 1], [340, 1400]);
  const boltOp = boltProgress > 0 ? interpolate(frame, [65, 70, 95, 100], [0, 1, 1, 0.8], { extrapolateRight: "clamp" }) : 0;
  const boltGlow = interpolate(frame % 6, [0, 3, 6], [0.5, 1, 0.5]);

  // Hook impact glow
  const hookGlow = frame >= 95 ? spring({ frame: frame - 95, fps, config: { damping: 8 } }) : 0;

  // Labels fade in
  const labelL1 = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const labelReactive = spring({ frame: frame - 25, fps, config: { damping: 14 } });
  const labelUnichain = spring({ frame: frame - 40, fps, config: { damping: 14 } });

  const blocks = Array.from({ length: 14 }, (_, i) => ({
    id: 1000 + i,
    isWhale: i === 6,
    size: i === 6 ? 60 : 40,
  }));

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 25% 50%, #0d1f2d, ${COLORS.bg})`,
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 40, width: "100%", textAlign: "center",
        opacity: headOp,
      }}>
        <h2 style={{ fontSize: 48, color: COLORS.accent, fontWeight: 800, margin: 0 }}>
          👁 The Reactive Sentry
        </h2>
        <p style={{ fontSize: 22, color: COLORS.muted, marginTop: 8 }}>
          Real-time cross-chain monitoring — the All-Seeing Guardian
        </p>
      </div>

      {/* ─── LEFT: Sentry Eye with Radar ─── */}
      <div style={{
        position: "absolute", left: 160, top: "50%", transform: "translateY(-50%)",
      }}>
        {/* Radar rings */}
        {[{ s: pulse1, o: pulse1Op }, { s: pulse2, o: pulse2Op }, { s: pulse3, o: pulse3Op }].map((p, i) => (
          <div key={i} style={{
            position: "absolute", width: 200, height: 200,
            borderRadius: "50%", top: -100, left: -100,
            border: `2px solid rgba(0,212,255,${p.o})`,
            transform: `translate(100px, 100px) scale(${p.s})`,
          }} />
        ))}

        {/* Eye icon */}
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}25, ${COLORS.bg})`,
          border: `3px solid ${COLORS.accent}60`,
          display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: 80, position: "relative", zIndex: 2,
          boxShadow: whaleDetected ? `0 0 ${40 * whaleFlash}px ${COLORS.accent}` : "none",
        }}>
          👁
        </div>

        {/* Label */}
        <div style={{
          textAlign: "center", marginTop: 16,
          opacity: labelReactive, transform: `scale(${labelReactive})`,
        }}>
          <div style={{ fontSize: 18, color: COLORS.accent, fontWeight: 700 }}>REACTIVE NETWORK</div>
          <div style={{ fontSize: 14, color: COLORS.muted }}>Sentry Contract</div>
        </div>
      </div>

      {/* ─── CENTER: L1 Block Stream ─── */}
      <div style={{
        position: "absolute", left: 520, top: 220, width: 500, height: 400,
        overflow: "hidden",
      }}>
        {/* L1 label */}
        <div style={{
          position: "absolute", top: -40, left: 0, width: "100%", textAlign: "center",
          opacity: labelL1,
        }}>
          <span style={{
            fontSize: 16, color: COLORS.muted, background: `${COLORS.card}`,
            padding: "6px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
          }}>
            L1 Block Stream (Ethereum)
          </span>
        </div>

        {/* Scrolling blocks */}
        <div style={{ transform: `translateY(${blockScroll}px)` }}>
          {blocks.map((block, i) => (
            <div key={i} style={{
              width: block.isWhale ? 420 : 350,
              height: block.size,
              margin: "12px auto",
              borderRadius: 10,
              background: block.isWhale
                ? (whaleDetected ? `linear-gradient(135deg, ${COLORS.red}40, ${COLORS.amber}30)` : COLORS.card)
                : COLORS.card,
              border: block.isWhale && whaleDetected
                ? `2px solid ${COLORS.red}`
                : `1px solid ${COLORS.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 20px",
              boxShadow: block.isWhale && whaleDetected
                ? `0 0 ${20 * whaleFlash}px ${COLORS.red}40` : "none",
            }}>
              <span style={{ fontSize: 14, color: COLORS.muted }}>Block #{block.id}</span>
              {block.isWhale ? (
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: whaleDetected ? COLORS.red : COLORS.muted,
                }}>
                  🐋 500K mLST DUMP
                </span>
              ) : (
                <span style={{ fontSize: 13, color: `${COLORS.muted}80` }}>regular txns</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Lightning Bolt / Reactive Payload ─── */}
      {boltProgress > 0 && (
        <div style={{
          position: "absolute",
          left: boltX,
          top: "48%",
          transform: "translateY(-50%)",
          opacity: boltOp,
          zIndex: 10,
        }}>
          <div style={{
            fontSize: 50,
            filter: `drop-shadow(0 0 ${12 * boltGlow}px ${COLORS.accent})`,
          }}>⚡</div>
          <div style={{
            position: "absolute", top: -30, left: -30, whiteSpace: "nowrap",
            fontSize: 13, color: COLORS.accent, fontWeight: 700,
            background: `${COLORS.bg}cc`, padding: "3px 10px", borderRadius: 6,
            border: `1px solid ${COLORS.accent}40`,
          }}>
            Reactive Payload
          </div>
        </div>
      )}

      {/* ─── RIGHT: Hook on Unichain ─── */}
      <div style={{
        position: "absolute", right: 140, top: "50%", transform: "translateY(-50%)",
      }}>
        <div style={{
          width: 180, height: 180, borderRadius: 24,
          background: hookGlow > 0
            ? `radial-gradient(circle, ${COLORS.green}30, ${COLORS.card})`
            : COLORS.card,
          border: hookGlow > 0
            ? `3px solid ${COLORS.green}`
            : `2px solid ${COLORS.accentAlt}40`,
          display: "flex", justifyContent: "center", alignItems: "center",
          flexDirection: "column", position: "relative",
          boxShadow: hookGlow > 0 ? `0 0 ${30 * hookGlow}px ${COLORS.green}40` : "none",
          opacity: labelUnichain,
        }}>
          <div style={{ fontSize: 60 }}>🪝</div>
          <div style={{ fontSize: 16, color: COLORS.white, fontWeight: 700, marginTop: 8 }}>Argos Hook</div>
        </div>

        <div style={{
          textAlign: "center", marginTop: 16,
          opacity: labelUnichain, transform: `scale(${labelUnichain})`,
        }}>
          <div style={{ fontSize: 18, color: COLORS.accentAlt, fontWeight: 700 }}>UNICHAIN</div>
          <div style={{ fontSize: 14, color: COLORS.muted }}>beforeSwap</div>
        </div>

        {/* State change indicator */}
        {hookGlow > 0 && (
          <div style={{
            textAlign: "center", marginTop: 12,
            opacity: hookGlow, transform: `scale(${hookGlow})`,
          }}>
            <div style={{
              display: "inline-block", padding: "6px 18px", borderRadius: 20,
              background: `${COLORS.red}20`, color: COLORS.red,
              fontSize: 16, fontWeight: 700, border: `1px solid ${COLORS.red}50`,
            }}>
              STATE → BLOCKED
            </div>
          </div>
        )}
      </div>

      {/* Bottom: flow description */}
      <div style={{
        position: "absolute", bottom: 50, width: "100%", textAlign: "center",
        opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <code style={{
          fontSize: 20, color: COLORS.accent, background: `${COLORS.accent}10`,
          padding: "10px 24px", borderRadius: 10, border: `1px solid ${COLORS.accent}30`,
        }}>
          L1 Whale Detection → Reactive Callback → Argos Risk Update → Swap Blocked
        </code>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6: State Machine Dashboard ───
const StateMachineScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // State transitions: Safe(0-50) → Restricted(50-90) → Blocked(90+)
  const statePhase = frame < 50 ? 0 : frame < 90 ? 1 : 2;
  const stateNames = ["SAFE", "RESTRICTED", "BLOCKED"];
  const stateColors = [COLORS.green, COLORS.amber, COLORS.red];
  const stateIcons = ["🟢", "🟡", "🔴"];

  // Sliding selector position (3 positions across the bar)
  const selectorX = interpolate(
    frame,
    [0, 50, 55, 90, 95, 150],
    [0, 0, 1, 1, 2, 2],
    { extrapolateRight: "clamp" }
  );
  const selectorPos = interpolate(selectorX, [0, 1, 2], [0, 340, 680]);

  // Transition flash
  const flash1 = frame >= 50 && frame <= 60
    ? interpolate(frame, [50, 55, 60], [0, 0.8, 0], { extrapolateRight: "clamp" }) : 0;
  const flash2 = frame >= 90 && frame <= 100
    ? interpolate(frame, [90, 95, 100], [0, 1, 0], { extrapolateRight: "clamp" }) : 0;

  // Shield overlay pulse (after blocked)
  const shieldActive = frame >= 95;
  const shieldPulse = shieldActive
    ? interpolate(frame % 30, [0, 15, 30], [0.08, 0.2, 0.08]) : 0;
  const shieldScale = shieldActive
    ? spring({ frame: frame - 95, fps, config: { damping: 8 } }) : 0;

  // Reactive signal animation (arrives at frame ~80)
  const signalProgress = frame >= 70 ? interpolate(frame, [70, 88], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const signalX = interpolate(signalProgress, [0, 1], [-200, 960]);
  const signalOp = signalProgress > 0 && signalProgress < 1 ? 1 : 0;

  // Metrics that change with state
  const metrics = [
    { label: "Pool Status", value: stateNames[statePhase], color: stateColors[statePhase] },
    { label: "Risk Level", value: statePhase === 0 ? "LOW" : statePhase === 1 ? "ELEVATED" : "CRITICAL", color: stateColors[statePhase] },
    { label: "Max Swap", value: statePhase === 0 ? "∞" : statePhase === 1 ? "50K" : "0", color: stateColors[statePhase] },
    { label: "Swaps Blocked", value: statePhase === 2 ? "ALL" : "NONE", color: statePhase === 2 ? COLORS.red : COLORS.green },
  ];

  // Log entries that appear over time
  const logs = [
    { time: "00:01", msg: "Pool initialized — RiskState.Safe", color: COLORS.green, showAt: 15 },
    { time: "00:03", msg: "Normal swap volume detected", color: COLORS.muted, showAt: 30 },
    { time: "00:05", msg: "⚡ Reactive signal: elevated whale activity", color: COLORS.amber, showAt: 55 },
    { time: "00:06", msg: "State → RESTRICTED (maxAbsAmount: 50K)", color: COLORS.amber, showAt: 65 },
    { time: "00:08", msg: "⚡ Reactive signal: 500K mLST dump detected", color: COLORS.red, showAt: 80 },
    { time: "00:09", msg: "🛑 State → BLOCKED — all swaps reverted", color: COLORS.red, showAt: 95 },
  ];

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 30%, #0f1520, ${COLORS.bg})`,
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      {/* Shield overlay */}
      {shieldActive && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none",
          background: `rgba(239,68,68,${shieldPulse})`,
          border: `4px solid rgba(239,68,68,${shieldPulse * 2})`,
          borderRadius: 0,
        }} />
      )}

      {/* Shield Active badge */}
      {shieldActive && (
        <div style={{
          position: "absolute", top: 30, right: 40, zIndex: 25,
          opacity: shieldScale, transform: `scale(${shieldScale})`,
        }}>
          <div style={{
            padding: "12px 28px", borderRadius: 12,
            background: `${COLORS.red}20`, border: `2px solid ${COLORS.red}`,
            display: "flex", alignItems: "center", gap: 12,
            boxShadow: `0 0 ${20 * shieldPulse * 5}px ${COLORS.red}40`,
          }}>
            <span style={{ fontSize: 28 }}>🛡</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.red }}>SHIELD ACTIVE</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>Pool Protected</div>
            </div>
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{
        position: "absolute", top: 40, left: 60,
        opacity: headOp,
      }}>
        <h2 style={{ fontSize: 42, color: COLORS.white, fontWeight: 800, margin: 0 }}>
          ⚙ State Machine Dashboard
        </h2>
        <p style={{ fontSize: 20, color: COLORS.muted, marginTop: 6 }}>
          Real-time risk state management for LST pools
        </p>
      </div>

      {/* ─── State Selector Bar ─── */}
      <div style={{
        position: "absolute", top: 160, left: "50%", transform: "translateX(-50%)",
        width: 1020, height: 90,
        background: COLORS.card,
        borderRadius: 20, border: `1px solid ${COLORS.border}`,
        display: "flex", alignItems: "center", padding: "0 10px",
        overflow: "hidden",
      }}>
        {/* Sliding selector highlight */}
        <div style={{
          position: "absolute", left: 10 + selectorPos, top: 8,
          width: 320, height: 74, borderRadius: 16,
          background: `${stateColors[statePhase]}15`,
          border: `2px solid ${stateColors[statePhase]}`,
          transition: "none",
          boxShadow: `0 0 20px ${stateColors[statePhase]}30`,
        }} />

        {/* State options */}
        {[0, 1, 2].map((i) => {
          const isActive = statePhase === i;
          return (
            <div key={i} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 14, zIndex: 2, height: "100%",
            }}>
              <span style={{ fontSize: 32 }}>{stateIcons[i]}</span>
              <div>
                <div style={{
                  fontSize: 22, fontWeight: 800,
                  color: isActive ? stateColors[i] : `${COLORS.muted}80`,
                }}>
                  {stateNames[i]}
                </div>
                <div style={{
                  fontSize: 12,
                  color: isActive ? stateColors[i] : `${COLORS.muted}50`,
                }}>
                  {i === 0 ? "Swaps allowed" : i === 1 ? "Swaps capped" : "Swaps blocked"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition flash overlay on the bar */}
      {(flash1 > 0 || flash2 > 0) && (
        <div style={{
          position: "absolute", top: 160, left: "50%", transform: "translateX(-50%)",
          width: 1020, height: 90, borderRadius: 20,
          background: flash2 > 0
            ? `rgba(239,68,68,${flash2 * 0.3})`
            : `rgba(245,158,11,${flash1 * 0.3})`,
          pointerEvents: "none", zIndex: 3,
        }} />
      )}

      {/* Reactive signal arrow */}
      {signalOp > 0 && (
        <div style={{
          position: "absolute", top: 270, left: signalX,
          opacity: signalOp, zIndex: 5,
        }}>
          <div style={{
            fontSize: 13, color: COLORS.red, fontWeight: 700,
            background: `${COLORS.bg}dd`, padding: "4px 12px", borderRadius: 6,
            border: `1px solid ${COLORS.red}50`, whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ⚡ Reactive Signal Incoming
          </div>
        </div>
      )}

      {/* ─── Metrics Cards ─── */}
      <div style={{
        position: "absolute", top: 320, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 24,
      }}>
        {metrics.map((m, i) => {
          const mScale = spring({ frame: frame - (10 + i * 8), fps, config: { damping: 14 } });
          return (
            <div key={i} style={{
              width: 220, padding: "24px 20px", borderRadius: 16,
              background: COLORS.card, border: `1px solid ${m.color}30`,
              textAlign: "center",
              transform: `scale(${mScale})`, opacity: mScale,
            }}>
              <div style={{ fontSize: 14, color: COLORS.muted, marginBottom: 10 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: m.color }}>{m.value}</div>
            </div>
          );
        })}
      </div>

      {/* ─── Event Log ─── */}
      <div style={{
        position: "absolute", bottom: 40, left: 60, right: 60,
        height: 200, overflow: "hidden",
      }}>
        <div style={{
          fontSize: 14, color: COLORS.muted, marginBottom: 10, fontWeight: 600,
          letterSpacing: 2,
        }}>
          EVENT LOG
        </div>
        {logs.map((log, i) => {
          const logOp = frame >= log.showAt
            ? interpolate(frame, [log.showAt, log.showAt + 10], [0, 1], { extrapolateRight: "clamp" }) : 0;
          return (
            <div key={i} style={{
              opacity: logOp,
              transform: `translateX(${interpolate(logOp, [0, 1], [20, 0])}px)`,
              display: "flex", alignItems: "center", gap: 12,
              marginBottom: 6, fontSize: 15,
            }}>
              <span style={{
                color: `${COLORS.muted}80`, fontFamily: "monospace", fontSize: 13,
              }}>[{log.time}]</span>
              <span style={{ color: log.color }}>{log.msg}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 7: Smart Parking vs AMM Curve ───
const AMMParkingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Phase 1 (0-45): Coin flies toward AMM curve
  // Phase 2 (45-70): Hook drops down and catches coin
  // Phase 3 (70-110): Coin redirects to vault
  // Phase 4 (110+): Explainer text appears

  // Coin position — starts left, moves right toward curve
  const coinPhase1X = interpolate(frame, [10, 45], [80, 680], { extrapolateRight: "clamp" });
  const coinPhase1Y = interpolate(frame, [10, 45], [420, 380], { extrapolateRight: "clamp" });

  // After hook catches (frame 55+), coin redirects downward to vault
  const caught = frame >= 55;
  const coinPhase2X = caught ? interpolate(frame, [55, 95], [720, 1420], { extrapolateRight: "clamp" }) : coinPhase1X;
  const coinPhase2Y = caught ? interpolate(frame, [55, 70, 95], [380, 340, 620], { extrapolateRight: "clamp" }) : coinPhase1Y;

  const coinX = caught ? coinPhase2X : coinPhase1X;
  const coinY = caught ? coinPhase2Y : coinPhase1Y;
  const coinVisible = frame >= 10;

  // Coin glow trail
  const coinTrailOp = caught
    ? interpolate(frame, [55, 60], [0, 0.6], { extrapolateRight: "clamp" })
    : interpolate(frame, [10, 20], [0, 0.4], { extrapolateRight: "clamp" });

  // Hook drops down at frame 40
  const hookY = frame >= 35
    ? interpolate(frame, [35, 50], [-120, 300], { extrapolateRight: "clamp" })
    : -120;
  const hookOp = frame >= 35
    ? interpolate(frame, [35, 45], [0, 1], { extrapolateRight: "clamp" }) : 0;

  // Hook catch flash
  const catchFlash = frame >= 50 && frame <= 60
    ? interpolate(frame, [50, 55, 60], [0, 1, 0], { extrapolateRight: "clamp" }) : 0;

  // Vault appears
  const vaultScale = frame >= 60
    ? spring({ frame: frame - 60, fps, config: { damping: 12 } }) : 0;

  // AMM curve stays stable indicator
  const curveStableOp = frame >= 80
    ? interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }) : 0;

  // Explainer cards
  const card1Op = frame >= 100
    ? spring({ frame: frame - 100, fps, config: { damping: 14 } }) : 0;
  const card2Op = frame >= 115
    ? spring({ frame: frame - 115, fps, config: { damping: 14 } }) : 0;

  // "Without Argos" ghost coin (would have hit the curve)
  const ghostOp = frame >= 55
    ? interpolate(frame, [55, 65, 90], [0.5, 0.3, 0], { extrapolateRight: "clamp" }) : 0;
  const ghostX = frame >= 55 ? interpolate(frame, [55, 80], [680, 900], { extrapolateRight: "clamp" }) : 680;
  const ghostY = frame >= 55 ? interpolate(frame, [55, 80], [380, 280], { extrapolateRight: "clamp" }) : 380;

  // SVG AMM curve path points
  const curvePoints = "M 850,600 Q 870,580 890,520 Q 910,440 930,360 Q 950,280 970,230 Q 990,190 1010,170 Q 1040,150 1070,145 Q 1100,142 1130,145 Q 1160,150 1180,165";

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 60% 40%, #0d1a2a, ${COLORS.bg})`,
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden",
    }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 35, width: "100%", textAlign: "center",
        opacity: headOp,
      }}>
        <h2 style={{ fontSize: 46, color: COLORS.accentAlt, fontWeight: 800, margin: 0 }}>
          🎯 Smart Parking vs. The AMM Curve
        </h2>
        <p style={{ fontSize: 20, color: COLORS.muted, marginTop: 8 }}>
          How ERC-6909 claims protect the price curve from toxic pressure
        </p>
      </div>

      {/* ─── AMM Price Curve (SVG) ─── */}
      <svg style={{ position: "absolute", inset: 0, width: 1920, height: 1080 }}>
        {/* Curve glow */}
        <defs>
          <filter id="curveGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* AMM curve */}
        <path d={curvePoints} fill="none" stroke={COLORS.accent}
          strokeWidth="3" opacity="0.7" filter="url(#curveGlow)" />
        <path d={curvePoints} fill="none" stroke={COLORS.accent}
          strokeWidth="1.5" opacity="0.3" strokeDasharray="6 4" />

        {/* Axis labels */}
        <text x="840" y="640" fill={COLORS.muted} fontSize="14">Price</text>
        <text x="1190" y="180" fill={COLORS.muted} fontSize="14">Token Qty</text>

        {/* Curve label */}
        <text x="1060" y="130" fill={COLORS.accent} fontSize="16" fontWeight="600"
          opacity="0.8" textAnchor="middle">AMM Price Curve</text>

        {/* "Price stays stable" checkmark */}
        {curveStableOp > 0 && (
          <g opacity={curveStableOp}>
            <rect x="940" y="80" width="240" height="36" rx="18"
              fill={`${COLORS.green}20`} stroke={COLORS.green} strokeWidth="1.5" />
            <text x="1060" y="103" fill={COLORS.green} fontSize="15"
              fontWeight="700" textAnchor="middle">✅ Price Curve Protected</text>
          </g>
        )}
      </svg>

      {/* ─── "Without Argos" ghost coin ─── */}
      {ghostOp > 0 && (
        <div style={{
          position: "absolute", left: ghostX, top: ghostY,
          opacity: ghostOp, fontSize: 36, pointerEvents: "none",
        }}>
          <div style={{ filter: "grayscale(1)" }}>🪙</div>
          <div style={{
            fontSize: 11, color: COLORS.red, fontWeight: 600,
            whiteSpace: "nowrap", marginTop: -4,
          }}>without Argos → price crash</div>
        </div>
      )}

      {/* ─── The Coin (Toxic Swap) ─── */}
      {coinVisible && (
        <div style={{
          position: "absolute", left: coinX, top: coinY,
          transform: "translate(-50%, -50%)",
          zIndex: 10,
        }}>
          {/* Trail glow */}
          <div style={{
            position: "absolute", width: 80, height: 80,
            borderRadius: "50%", top: -20, left: -20,
            background: caught
              ? `radial-gradient(circle, ${COLORS.green}40, transparent 70%)`
              : `radial-gradient(circle, ${COLORS.red}40, transparent 70%)`,
            opacity: coinTrailOp,
          }} />
          {/* Coin */}
          <div style={{
            fontSize: 44, position: "relative", zIndex: 2,
            filter: caught
              ? `drop-shadow(0 0 8px ${COLORS.green})`
              : `drop-shadow(0 0 8px ${COLORS.red})`,
          }}>🪙</div>
          {/* Label */}
          <div style={{
            position: "absolute", top: -28, left: -30, whiteSpace: "nowrap",
            fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            background: caught ? `${COLORS.green}20` : `${COLORS.red}20`,
            color: caught ? COLORS.green : COLORS.red,
            border: `1px solid ${caught ? COLORS.green : COLORS.red}40`,
          }}>
            {caught ? "🟢 Parked Safely" : "🐋 500K mLST Swap"}
          </div>
        </div>
      )}

      {/* ─── Argos Hook (drops down) ─── */}
      <div style={{
        position: "absolute", left: 700, top: hookY,
        opacity: hookOp, zIndex: 15, textAlign: "center",
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: 20,
          background: `linear-gradient(135deg, ${COLORS.accent}25, ${COLORS.accentAlt}25)`,
          border: `2px solid ${COLORS.accent}80`,
          display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: 50,
          boxShadow: catchFlash > 0 ? `0 0 ${40 * catchFlash}px ${COLORS.accent}` : `0 0 15px ${COLORS.accent}30`,
        }}>
          🪝
        </div>
        <div style={{ fontSize: 14, color: COLORS.accent, fontWeight: 700, marginTop: 6 }}>
          Argos Hook
        </div>
        <div style={{ fontSize: 11, color: COLORS.muted }}>beforeSwap</div>
      </div>

      {/* Catch flash burst */}
      {catchFlash > 0 && (
        <div style={{
          position: "absolute", left: 700, top: hookY + 30,
          width: 160, height: 160, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(0,212,255,${catchFlash * 0.4}), transparent 70%)`,
          transform: "translate(-30px, -30px)",
          zIndex: 14,
        }} />
      )}

      {/* ─── ERC-6909 Vault ─── */}
      <div style={{
        position: "absolute", right: 160, bottom: 200,
        transform: `scale(${vaultScale})`, opacity: vaultScale,
        zIndex: 8,
      }}>
        <div style={{
          width: 260, padding: "30px 24px", borderRadius: 20,
          background: `linear-gradient(135deg, ${COLORS.card}, rgba(16, 185, 129, 0.08))`,
          border: `2px solid ${COLORS.green}50`,
          textAlign: "center",
          boxShadow: `0 0 30px ${COLORS.green}15`,
        }}>
          <div style={{ fontSize: 50, marginBottom: 10 }}>🏦</div>
          <div style={{
            fontSize: 22, fontWeight: 800, color: COLORS.green, marginBottom: 6,
          }}>ERC-6909 Claim</div>
          <div style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.5 }}>
            Capital safely held<br/>Redeemable when<br/>conditions normalize
          </div>
          <div style={{
            marginTop: 14, padding: "6px 16px", borderRadius: 20,
            background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}30`,
            fontSize: 13, color: COLORS.green, fontWeight: 600,
            display: "inline-block",
          }}>
            poolManager.mint()
          </div>
        </div>
      </div>

      {/* ─── Dashed redirect path (hook → vault) ─── */}
      {caught && (
        <svg style={{ position: "absolute", inset: 0, width: 1920, height: 1080, zIndex: 7 }}>
          <path d="M 750,420 Q 1050,350 1420,620"
            fill="none" stroke={COLORS.green} strokeWidth="2"
            strokeDasharray="8 6"
            opacity={interpolate(frame, [58, 68], [0, 0.6], { extrapolateRight: "clamp" })} />
        </svg>
      )}

      {/* ─── Explainer Cards ─── */}
      <div style={{
        position: "absolute", bottom: 50, left: 60,
        display: "flex", gap: 20,
      }}>
        <div style={{
          width: 350, padding: "20px 24px", borderRadius: 14,
          background: COLORS.card, border: `1px solid ${COLORS.red}30`,
          transform: `scale(${card1Op})`, opacity: card1Op,
        }}>
          <div style={{ fontSize: 14, color: COLORS.red, fontWeight: 700, marginBottom: 8 }}>
            ❌ Without Argos
          </div>
          <div style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.5 }}>
            Toxic swap hits the AMM curve directly,<br/>crashing the price and draining LP value.
          </div>
        </div>

        <div style={{
          width: 350, padding: "20px 24px", borderRadius: 14,
          background: COLORS.card, border: `1px solid ${COLORS.green}30`,
          transform: `scale(${card2Op})`, opacity: card2Op,
        }}>
          <div style={{ fontSize: 14, color: COLORS.green, fontWeight: 700, marginBottom: 8 }}>
            ✅ With Argos
          </div>
          <div style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.5 }}>
            Hook intercepts the swap, mints an ERC-6909<br/>claim, and parks capital safely in the vault.
          </div>
        </div>
      </div>

      {/* Bottom code reference */}
      <div style={{
        position: "absolute", bottom: 15, right: 60,
        opacity: interpolate(frame, [120, 135], [0, 0.7], { extrapolateRight: "clamp" }),
      }}>
        <code style={{
          fontSize: 14, color: COLORS.accentAlt, background: `${COLORS.accentAlt}10`,
          padding: "6px 14px", borderRadius: 8, border: `1px solid ${COLORS.accentAlt}20`,
        }}>
          toBeforeSwapDelta(int128(amountIn), 0)
        </code>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 8: Closing / CTA ───
const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 10 } });
  const tagOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = interpolate(frame, [0, 45, 90], [0.2, 0.6, 0.2], { extrapolateRight: "extend" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 40%, #111f33, ${COLORS.bg})`,
      justifyContent: "center", alignItems: "center",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        position: "absolute",
        width: 600, height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(124,58,237,${glowPulse * 0.12}), transparent 70%)`,
        top: "10%", left: "30%",
      }} />

      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <h1 style={{
          fontSize: 100, fontWeight: 900, margin: 0,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentAlt})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          ARGOS
        </h1>
        <p style={{ fontSize: 30, color: COLORS.muted, marginTop: 16, fontWeight: 300 }}>
          Protecting LST Liquidity on Uniswap v4
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 50, opacity: tagOp }}>
        {["Unichain", "Reactive Network", "beforeSwap", "ERC-6909"].map((t, i) => (
          <div key={i} style={{
            padding: "10px 22px", borderRadius: 50,
            border: `1px solid ${COLORS.accentAlt}50`,
            background: `${COLORS.accentAlt}10`,
            color: COLORS.accentAlt, fontSize: 18, fontWeight: 600,
          }}>
            {t}
          </div>
        ))}
      </div>

      <p style={{
        marginTop: 50, fontSize: 22, color: COLORS.accent, opacity: tagOp, fontWeight: 600,
      }}>
        github.com/rainwaters11/Argos_LTS
      </p>
    </AbsoluteFill>
  );
};

// ─── Main Composition ───
export const ArgosDemo = () => {
  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      <Sequence from={0} durationInFrames={90}>
        <TitleScene />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <ProblemScene />
      </Sequence>
      <Sequence from={180} durationInFrames={100}>
        <SolutionScene />
      </Sequence>
      <Sequence from={280} durationInFrames={100}>
        <ParkingScene />
      </Sequence>
      {/* NEW: Park vs Revert comparison */}
      <Sequence from={380} durationInFrames={120}>
        <ParkVsRevertScene />
      </Sequence>
      {/* NEW: Lit Protocol redemption gate */}
      <Sequence from={500} durationInFrames={120}>
        <LitGateScene />
      </Sequence>
      <Sequence from={620} durationInFrames={150}>
        <ReactiveSentryScene />
      </Sequence>
      <Sequence from={770} durationInFrames={150}>
        <StateMachineScene />
      </Sequence>
      <Sequence from={920} durationInFrames={150}>
        <AMMParkingScene />
      </Sequence>
      <Sequence from={1070} durationInFrames={70}>
        <ClosingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
