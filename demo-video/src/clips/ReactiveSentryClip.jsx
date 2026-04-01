import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

const COLORS = {
  bg: "#0a0e1a",
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

/**
 * TriggerEvent clip — standalone 5-second (150 frames) hype cut
 * For full-screen use at 2:15–2:25 in the demo video.
 *
 * Timeline:
 *  0-20:   Scene fades in, sentry + blocks visible, blocks scrolling
 *  20-40:  Whale block appears with red highlight
 *  40-50:  Detection flash on the sentry eye
 *  50-55:  "WHALE DETECTED" HUD alert slams in
 *  55-100: Lightning bolt fires from sentry to hook
 *  100-120: Hook impact + state change
 *  120-150: Hold with "Pool Protected" status
 */
export const ReactiveSentryClip = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in
  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Radar pulse rings (continuous)
  const pulse1 = interpolate(frame % 40, [0, 40], [0.4, 2.0], { extrapolateRight: "clamp" });
  const pulse1Op = interpolate(frame % 40, [0, 40], [0.7, 0], { extrapolateRight: "clamp" });
  const pulse2 = interpolate((frame + 13) % 40, [0, 40], [0.4, 2.0], { extrapolateRight: "clamp" });
  const pulse2Op = interpolate((frame + 13) % 40, [0, 40], [0.7, 0], { extrapolateRight: "clamp" });
  const pulse3 = interpolate((frame + 26) % 40, [0, 40], [0.4, 2.0], { extrapolateRight: "clamp" });
  const pulse3Op = interpolate((frame + 26) % 40, [0, 40], [0.7, 0], { extrapolateRight: "clamp" });

  // Block stream scrolls
  const blockScroll = interpolate(frame, [0, 150], [100, -700], { extrapolateRight: "clamp" });

  // Whale detection at frame 30
  const whaleDetected = frame >= 30;
  const whaleFlash = whaleDetected
    ? interpolate(frame, [30, 38, 48], [0, 1, 0.6], { extrapolateRight: "clamp" }) : 0;

  // Screen shake on detection
  const shakeX = frame >= 30 && frame <= 40
    ? Math.sin(frame * 8) * interpolate(frame, [30, 40], [6, 0], { extrapolateRight: "clamp" }) : 0;
  const shakeY = frame >= 30 && frame <= 40
    ? Math.cos(frame * 11) * interpolate(frame, [30, 40], [4, 0], { extrapolateRight: "clamp" }) : 0;

  // "WHALE DETECTED" HUD alert
  const alertScale = frame >= 35
    ? spring({ frame: frame - 35, fps, config: { damping: 8, stiffness: 200 } }) : 0;
  const alertPulse = frame >= 40
    ? interpolate(frame % 20, [0, 10, 20], [0.7, 1, 0.7]) : 1;

  // Lightning bolt flight (frame 55 → 100)
  const boltActive = frame >= 55 && frame <= 105;
  const boltProgress = boltActive
    ? interpolate(frame, [55, 100], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const boltX = interpolate(boltProgress, [0, 1], [300, 1500]);
  const boltY = interpolate(boltProgress, [0, 0.3, 0.7, 1], [480, 430, 460, 480]);
  const boltOp = boltActive
    ? interpolate(frame, [55, 58, 97, 105], [0, 1, 1, 0], { extrapolateRight: "clamp" }) : 0;
  const boltGlow = interpolate(frame % 4, [0, 2, 4], [0.5, 1, 0.5]);

  // Bolt trail particles
  const trailCount = 8;

  // Hook impact glow (frame 95+)
  const hookGlow = frame >= 95
    ? spring({ frame: frame - 95, fps, config: { damping: 6, stiffness: 150 } }) : 0;

  // Impact shockwave
  const impactRing = frame >= 97
    ? interpolate(frame, [97, 115], [0, 3], { extrapolateRight: "clamp" }) : 0;
  const impactOp = frame >= 97
    ? interpolate(frame, [97, 115], [0.8, 0], { extrapolateRight: "clamp" }) : 0;

  // "STATE → BLOCKED" badge
  const blockedScale = frame >= 105
    ? spring({ frame: frame - 105, fps, config: { damping: 10 } }) : 0;

  // Screen red tint on block
  const redOverlay = frame >= 100
    ? interpolate(frame % 30, [0, 15, 30], [0.03, 0.08, 0.03]) : 0;

  // Blocks data
  const blocks = Array.from({ length: 12 }, (_, i) => ({
    id: 18442 + i,
    isWhale: i === 5,
    height: i === 5 ? 72 : 44,
  }));

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 25% 45%, #0d1f2d, ${COLORS.bg})`,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: "hidden",
      opacity: fadeIn,
      transform: `translate(${shakeX}px, ${shakeY}px)`,
    }}>
      {/* RED OVERLAY after block */}
      {redOverlay > 0 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none",
          background: `rgba(239,68,68,${redOverlay})`,
        }} />
      )}

      {/* ─── TOP HUD BAR ─── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 50,
        background: `linear-gradient(180deg, rgba(0,0,0,0.6), transparent)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: whaleDetected ? COLORS.red : COLORS.green,
            boxShadow: `0 0 8px ${whaleDetected ? COLORS.red : COLORS.green}`,
          }} />
          <span style={{ fontSize: 14, color: COLORS.muted, fontWeight: 600, letterSpacing: 2 }}>
            REACTIVE NETWORK MONITOR
          </span>
        </div>
        <span style={{ fontSize: 13, color: `${COLORS.muted}80`, fontFamily: "monospace" }}>
          BLOCK #{blocks[5].id} | L1 ETHEREUM
        </span>
      </div>

      {/* ─── SENTRY EYE (left) ─── */}
      <div style={{
        position: "absolute", left: 120, top: "50%", transform: "translateY(-50%)",
      }}>
        {/* Radar rings */}
        {[
          { s: pulse1, o: pulse1Op },
          { s: pulse2, o: pulse2Op },
          { s: pulse3, o: pulse3Op },
        ].map((p, i) => (
          <div key={i} style={{
            position: "absolute", width: 220, height: 220,
            borderRadius: "50%", top: -110, left: -110,
            border: `2px solid rgba(0,212,255,${p.o})`,
            transform: `translate(110px, 110px) scale(${p.s})`,
          }} />
        ))}

        {/* Eye */}
        <div style={{
          width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}30, ${COLORS.bg})`,
          border: `3px solid ${whaleDetected ? COLORS.red : COLORS.accent}80`,
          display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: 90, position: "relative", zIndex: 2,
          boxShadow: whaleDetected
            ? `0 0 ${50 * whaleFlash}px ${COLORS.red}, inset 0 0 30px ${COLORS.red}20`
            : `0 0 15px ${COLORS.accent}30`,
        }}>
          👁
        </div>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <div style={{ fontSize: 16, color: COLORS.accent, fontWeight: 700 }}>SENTRY</div>
        </div>
      </div>

      {/* ─── BLOCK STREAM (center) ─── */}
      <div style={{
        position: "absolute", left: 500, top: 120, width: 520, height: 700,
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", textAlign: "center",
          zIndex: 5,
        }}>
          <span style={{
            fontSize: 13, color: COLORS.muted, background: `${COLORS.bg}cc`,
            padding: "4px 14px", borderRadius: 6, border: `1px solid ${COLORS.border}`,
            letterSpacing: 1,
          }}>
            ▼ L1 BLOCK STREAM
          </span>
        </div>

        <div style={{ transform: `translateY(${blockScroll}px)`, marginTop: 40 }}>
          {blocks.map((block, i) => (
            <div key={i} style={{
              width: block.isWhale ? 480 : 400,
              height: block.height,
              margin: `${block.isWhale ? 16 : 10}px auto`,
              borderRadius: 12,
              background: block.isWhale && whaleDetected
                ? `linear-gradient(135deg, ${COLORS.red}30, ${COLORS.amber}20)`
                : COLORS.card,
              border: block.isWhale && whaleDetected
                ? `2px solid ${COLORS.red}`
                : `1px solid ${COLORS.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0 24px",
              boxShadow: block.isWhale && whaleDetected
                ? `0 0 ${25 * whaleFlash}px ${COLORS.red}50` : "none",
            }}>
              <span style={{
                fontSize: 13, color: COLORS.muted, fontFamily: "monospace",
              }}>
                #{block.id}
              </span>
              {block.isWhale ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: block.isWhale && whaleDetected ? 18 : 14,
                    fontWeight: 800,
                    color: whaleDetected ? COLORS.red : COLORS.muted,
                  }}>
                    🐋 750,000 mLST DUMP
                  </span>
                  {whaleDetected && (
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 4,
                      background: `${COLORS.red}20`, color: COLORS.red,
                      fontWeight: 700, border: `1px solid ${COLORS.red}50`,
                    }}>
                      TOXIC
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: `${COLORS.muted}60` }}>
                  {i % 3 === 0 ? "swap 0.5 ETH" : i % 3 === 1 ? "transfer" : "approve"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── WHALE DETECTED ALERT ─── */}
      {alertScale > 0 && (
        <div style={{
          position: "absolute", top: 70, left: "50%", transform: `translateX(-50%) scale(${alertScale})`,
          zIndex: 40,
        }}>
          <div style={{
            padding: "14px 40px", borderRadius: 14,
            background: `${COLORS.red}18`,
            border: `2px solid ${COLORS.red}`,
            boxShadow: `0 0 ${30 * alertPulse}px ${COLORS.red}40`,
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 30 }}>🚨</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.red, letterSpacing: 2 }}>
                WHALE DETECTED
              </div>
              <div style={{ fontSize: 13, color: COLORS.muted }}>
                750,000 mLST dump — initiating reactive callback
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── LIGHTNING BOLT ─── */}
      {boltOp > 0 && (
        <>
          {/* Trail particles */}
          {Array.from({ length: trailCount }).map((_, i) => {
            const trailDelay = i * 4;
            const trailFrame = frame - 55 - trailDelay;
            if (trailFrame < 0 || trailFrame > 50) return null;
            const tProgress = interpolate(trailFrame, [0, 45], [0, 1], { extrapolateRight: "clamp" });
            const tX = interpolate(tProgress, [0, 1], [300, 1500]);
            const tY = interpolate(tProgress, [0, 0.3, 0.7, 1], [480, 430, 460, 480]);
            const tOp = interpolate(trailFrame, [0, 5, 35, 45], [0, 0.5, 0.3, 0], { extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                position: "absolute", left: tX, top: tY,
                width: 6, height: 6, borderRadius: "50%",
                background: COLORS.accent,
                opacity: tOp,
                boxShadow: `0 0 8px ${COLORS.accent}`,
                zIndex: 9,
              }} />
            );
          })}

          {/* Main bolt */}
          <div style={{
            position: "absolute", left: boltX, top: boltY,
            transform: "translate(-50%, -50%)",
            opacity: boltOp, zIndex: 10,
          }}>
            <div style={{
              fontSize: 60,
              filter: `drop-shadow(0 0 ${16 * boltGlow}px ${COLORS.accent})`,
            }}>⚡</div>
            <div style={{
              position: "absolute", top: -32, left: -40, whiteSpace: "nowrap",
              fontSize: 14, color: COLORS.accent, fontWeight: 800,
              background: `${COLORS.bg}dd`, padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${COLORS.accent}50`,
              letterSpacing: 1,
            }}>
              REACTIVE PAYLOAD
            </div>
          </div>
        </>
      )}

      {/* ─── HOOK (right) ─── */}
      <div style={{
        position: "absolute", right: 120, top: "50%", transform: "translateY(-50%)",
        textAlign: "center",
      }}>
        {/* Impact shockwave ring */}
        {impactRing > 0 && (
          <div style={{
            position: "absolute", width: 200, height: 200,
            borderRadius: "50%", top: -10, left: -10,
            border: `3px solid ${COLORS.green}`,
            opacity: impactOp,
            transform: `scale(${impactRing})`,
          }} />
        )}

        <div style={{
          width: 180, height: 180, borderRadius: 24,
          background: hookGlow > 0
            ? `radial-gradient(circle, ${COLORS.green}35, ${COLORS.card})`
            : COLORS.card,
          border: hookGlow > 0
            ? `3px solid ${COLORS.green}`
            : `2px solid ${COLORS.accentAlt}40`,
          display: "flex", justifyContent: "center", alignItems: "center",
          flexDirection: "column",
          boxShadow: hookGlow > 0
            ? `0 0 ${40 * hookGlow}px ${COLORS.green}50`
            : "none",
        }}>
          <div style={{ fontSize: 65 }}>🪝</div>
          <div style={{ fontSize: 14, color: COLORS.white, fontWeight: 700 }}>Argos Hook</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, color: COLORS.accentAlt, fontWeight: 700 }}>UNICHAIN</div>
        </div>

        {/* BLOCKED badge */}
        {blockedScale > 0 && (
          <div style={{
            marginTop: 14, transform: `scale(${blockedScale})`, opacity: blockedScale,
          }}>
            <div style={{
              display: "inline-block", padding: "8px 22px", borderRadius: 20,
              background: `${COLORS.red}20`, color: COLORS.red,
              fontSize: 18, fontWeight: 800, border: `2px solid ${COLORS.red}`,
              boxShadow: `0 0 15px ${COLORS.red}30`,
              letterSpacing: 2,
            }}>
              🛑 BLOCKED
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom flow bar ─── */}
      <div style={{
        position: "absolute", bottom: 30, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        opacity: interpolate(frame, [105, 120], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          padding: "10px 30px", borderRadius: 12,
          background: `${COLORS.bg}ee`, border: `1px solid ${COLORS.accent}30`,
          display: "flex", alignItems: "center", gap: 16, fontSize: 16,
        }}>
          <span style={{ color: COLORS.red, fontWeight: 700 }}>🐋 Whale Dump</span>
          <span style={{ color: COLORS.muted }}>→</span>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>⚡ Reactive Signal</span>
          <span style={{ color: COLORS.muted }}>→</span>
          <span style={{ color: COLORS.green, fontWeight: 700 }}>🛡 Pool Protected</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
