import React from "react";
import { Settings, Home, TrendingDown, TrendingUp, Star, Trophy, Disc3, Timer, Gift, Ticket, Wallet, ChevronRight } from "lucide-react";
import { currency, themeOf } from "../utils/format";
import PetLCD from "./pet/PetLCD";
import PixelHeart from "./pet/PixelHeart";
import { currentFullness, heartsOf, petStage, PET_SPECIES } from "../../lib/petRules.js";

// 卡片上的常用功能：點下去各自進到獨立的功能頁
const ACTIONS = [
  { id: "today", label: "今日責任", Icon: Home },
  { id: "expense", label: "支出", Icon: TrendingDown },
  { id: "income", label: "收入", Icon: TrendingUp },
  { id: "points", label: "責任", Icon: Star },
  { id: "challenge", label: "挑戰", Icon: Trophy },
  { id: "rewardWheel", label: "轉盤", Icon: Gift },
  { id: "coupons", label: "券夾", Icon: Ticket },
  { id: "account", label: "帳戶", Icon: Wallet },
];

export default function HomeScreen({
  kids,
  responsibilities,
  responsibilityLogs,
  challenges,
  coupons = [],
  rewardSpins = [],
  today,
  onSelectKid,
  onAction,
  onManage,
  onWheel,
  onTimer,
  timerLabel = null,
  pets = [],
}) {
  return (
    <div style={{ padding: "20px 18px 40px", minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800 }}>總覽</div>
          <div style={{ color: "#B4A392", fontSize: 12.5, marginTop: 2 }}>小小存錢筒</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={onWheel}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 38,
              padding: "0 13px",
              borderRadius: 12,
              border: "none",
              background: "#FFEDE1",
              color: "#E86A3A",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <Disc3 size={16} color="#E86A3A" /> 小轉盤
          </button>
          <button
            onClick={onTimer}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              height: 38,
              padding: "0 13px",
              borderRadius: 12,
              border: "none",
              background: timerLabel ? "#3DB88A" : "#EAF8F2",
              color: timerLabel ? "#fff" : "#2A9670",
              fontWeight: 800,
              fontSize: 13,
            }}
          >
            <Timer size={16} color={timerLabel ? "#fff" : "#2A9670"} /> {timerLabel || "專注鐘"}
          </button>
          <button
            onClick={onManage}
            aria-label="管理"
            style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: "#F1E7DC" }}
          >
            <Settings size={18} color="#94795F" />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {kids.map((kid) => {
          const theme = themeOf(kid.theme_id);
          const goalPct =
            kid.goal_amount > 0 ? Math.min(100, Math.round((kid.balance / kid.goal_amount) * 100)) : null;

          const kidResponsibilities = responsibilities.filter((r) => r.kid_id === kid.id);
          const doneIds = new Set(
            responsibilityLogs
              .filter((l) => l.kid_id === kid.id && String(l.log_date).slice(0, 10) === today)
              .map((l) => l.responsibility_id)
          );
          const doneCount = kidResponsibilities.filter((r) => doneIds.has(r.id)).length;
          const openChallenges = challenges.filter((c) => c.kid_id === kid.id && c.status === "open").length;
          const unusedCoupons = coupons.filter((c) => c.kid_id === kid.id && c.status === "unused").length;
          const spunToday = rewardSpins.some((s) => s.kid_id === kid.id);
          const allDone = kidResponsibilities.length > 0 && doneCount === kidResponsibilities.length;
          const pet = pets.find((p) => p.kid_id === kid.id);
          const petFull = pet ? currentFullness(pet.fullness, pet.fullness_at) : null;

          const badgeFor = (actionId) => {
            if (actionId === "today" && kidResponsibilities.length > 0) {
              return `${doneCount}/${kidResponsibilities.length}`;
            }
            if (actionId === "challenge" && openChallenges > 0) return String(openChallenges);
            if (actionId === "coupons" && unusedCoupons > 0) return String(unusedCoupons);
            // 責任全做完又還沒轉，就提示今天可以轉一次
            if (actionId === "rewardWheel" && allDone && !spunToday) return "可轉";
            return null;
          };

          return (
            <div
              key={kid.id}
              style={{
                border: `2px solid ${theme.accent}`,
                borderRadius: 22,
                background: theme.bg,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => onSelectKid(kid.id)}
                style={{
                  width: "100%",
                  border: "none",
                  background: "none",
                  padding: "18px 18px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 42 }}>{kid.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 20 }}>
                    {kid.name}
                  </div>
                  {goalPct !== null && (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#8A7457", marginTop: 3 }}>
                      🎯 {kid.goal_name} {goalPct}%
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 24 }}>
                    {currency(kid.balance)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#8A7457" }}>⭐ {kid.character_points || 0}</div>
                </div>
                {/* 點這一列會進到本週表現，用箭頭讓人看得出來可以點 */}
                <ChevronRight size={18} color={theme.accentDark} style={{ opacity: 0.5, marginLeft: -4 }} />
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                  padding: "0 12px 14px",
                }}
              >
                {ACTIONS.map(({ id, label, Icon }) => {
                  const badge = badgeFor(id);
                  return (
                    <button
                      key={id}
                      onClick={() => onAction(kid.id, id)}
                      style={{
                        position: "relative",
                        border: "none",
                        borderRadius: 14,
                        background: "#fff",
                        padding: "10px 2px 8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon size={18} color={theme.accentDark} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8A7457", whiteSpace: "nowrap" }}>{label}</span>
                      {badge && (
                        <span
                          style={{
                            position: "absolute",
                            top: 4,
                            right: 6,
                            background: theme.accent,
                            color: "#fff",
                            fontSize: 9.5,
                            fontWeight: 800,
                            borderRadius: 8,
                            padding: "1px 5px",
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {pet && <PetStrip pet={pet} fullness={petFull} theme={theme} onOpen={() => onAction(kid.id, "pet")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 卡片下面的寵物小螢幕：一眼看出牠餓不餓，點了進寵物頁
function PetStrip({ pet, fullness, theme, onOpen }) {
  const { stage, species } = petStage(pet);
  const hatched = stage === "hatched";
  const hearts = heartsOf(fullness);
  const h = new Date().getHours();
  const sleeping = h >= 21 || h < 7;
  const title =
    stage === "choose" ? "還沒有寵物" : stage === "egg" ? `${PET_SPECIES[species]?.name || ""}的蛋` : pet.name || "小團子";
  const status =
    stage === "choose"
      ? "點進來選一顆蛋！"
      : stage === "egg"
      ? "點進來幫牠孵化 🥚"
      : fullness <= 0
      ? "餓扁了！"
      : fullness < 30
      ? "肚子餓了！"
      : sleeping
      ? "睡覺中 💤"
      : fullness > 90
      ? "吃飽飽"
      : "";
  const urgent = hatched && fullness < 30;
  return (
    <button
      onClick={onOpen}
      style={{
        width: "calc(100% - 24px)",
        margin: "0 12px 14px",
        border: "none",
        borderRadius: 14,
        background: "#fff",
        padding: 7,
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
      }}
    >
      <div style={{ width: 132, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "3px solid #4B3F33" }}>
        <PetLCD cols={44} rows={17} fullness={fullness} species={species || "dango"} stage={stage} compact />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: "#5A4632", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        {hatched && (
          <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <PixelHeart key={i} full={i < hearts} size={13} color={theme.accentDark} />
            ))}
          </div>
        )}
        {status && (
          <div style={{ fontSize: 11, fontWeight: 800, marginTop: 3, color: urgent ? "#E85D5D" : hatched ? "#94795F" : theme.accentDark }}>{status}</div>
        )}
      </div>
      <ChevronRight size={16} color={theme.accentDark} style={{ opacity: 0.5, flexShrink: 0 }} />
    </button>
  );
}
