import React, { useEffect, useState } from "react";
import { ChevronLeft, Pencil, Check } from "lucide-react";
import { feedPet, renamePet } from "../api/client";
import { themeOf } from "../utils/format";
import PetLCD from "./pet/PetLCD";
import PixelHeart from "./pet/PixelHeart";
import { PET_FOODS, PET_TOO_FULL, currentFullness, heartsOf } from "../../lib/petRules.js";

const isNight = () => {
  const h = new Date().getHours();
  return h >= 21 || h < 7;
};

// 小寵物（電子雞）頁：用責任值星星買食物餵牠。
// 每天第一次餵到全飽會送一個驚喜（從獎勵轉盤的獎品抽），餵食時偶爾也會撿到星星。
export default function PetScreen({ kid, pet, today, onBack, refetch }) {
  const theme = themeOf(kid.theme_id);
  const [now, setNow] = useState(Date.now());
  const [override, setOverride] = useState(null); // 剛餵完、資料還沒重新抓回來前先用這個
  const [event, setEvent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [gift, setGift] = useState(null);
  const [pendingGift, setPendingGift] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // 飽足度是一直在掉的，畫面每 30 秒重算一次
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // 伺服器的新資料回來了，就不用再靠暫存值
  useEffect(() => setOverride(null), [pet?.fullness_at]);

  const base = override || { fullness: pet?.fullness ?? 60, at: pet?.fullness_at ?? new Date().toISOString() };
  const fullness = currentFullness(base.fullness, base.at, now);
  const hearts = heartsOf(fullness);
  const tooFull = fullness > PET_TOO_FULL;
  const stars = Number(kid.character_points) || 0;
  const petName = pet?.name || "小團子";
  const giftDone = pet?.last_gift_date === today;

  const feed = async (food) => {
    if (busy) return;
    setMsg("");
    setBusy(true);
    try {
      const r = await feedPet(kid.id, food.id);
      setOverride({ fullness: r.fullness, at: new Date().toISOString() });
      setPendingGift(r.gift || null);
      setEvent({ id: Date.now(), type: "eat", food: food.id, gift: !!r.gift });
      refetch(); // 背景更新星星數，不用等
    } catch (e) {
      setMsg(e.message || "餵食失敗");
      setBusy(false);
    }
  };

  const onEventDone = (evt) => {
    if (evt?.type === "eat") {
      setBusy(false);
      if (pendingGift) {
        setGift(pendingGift);
        setPendingGift(null);
      }
    }
  };

  const poke = () => {
    if (busy) return;
    setEvent({ id: Date.now(), type: "pet" });
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    setEditingName(false);
    if (!name || name === petName) return;
    try {
      await renamePet(kid.id, name);
      await refetch();
    } catch (e) {
      setMsg(e.message);
    }
  };

  const statusLine = () => {
    if (fullness <= 0) return "餓扁了！快餵牠吃東西";
    if (fullness < 30) return "肚子好餓⋯⋯";
    if (fullness < 70) return "有一點點餓";
    if (tooFull) return "吃得飽飽的，現在吃不下了";
    return "心情很好";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 8px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
          {kid.avatar} {kid.name}的寵物
        </span>
        <span style={{ marginLeft: "auto", fontWeight: 800, color: "#8A7457", fontSize: 15 }}>⭐ {stars}</span>
      </div>

      <div style={{ padding: "6px 18px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* 電子雞的外殼：用小孩的主題色 */}
        <div
          style={{
            width: "100%",
            maxWidth: 340,
            background: `linear-gradient(160deg, ${theme.accent} 0%, ${theme.accentDark} 100%)`,
            borderRadius: "46% 46% 40% 40% / 30% 30% 26% 26%",
            padding: "26px 26px 30px",
            boxSizing: "border-box",
            boxShadow: `inset 0 -6px 0 rgba(0,0,0,.12), inset 0 4px 0 rgba(255,255,255,.25), 0 8px 20px rgba(90,70,50,.18)`,
          }}
        >
          {/* 名字 */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 10, minHeight: 30 }}>
            {editingName ? (
              <>
                <input
                  autoFocus
                  value={nameDraft}
                  maxLength={10}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  style={{ width: 130, border: "none", borderRadius: 10, padding: "6px 10px", fontSize: 15, fontWeight: 800, textAlign: "center", outline: "none" }}
                />
                <button onClick={saveName} aria-label="儲存名字" style={{ border: "none", borderRadius: 9, width: 30, height: 30, background: "rgba(255,255,255,.9)" }}>
                  <Check size={16} color={theme.accentDark} />
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setNameDraft(petName);
                  setEditingName(true);
                }}
                style={{ border: "none", background: "none", color: "#fff", fontWeight: 800, fontSize: 17, display: "flex", alignItems: "center", gap: 6, textShadow: "0 1px 0 rgba(0,0,0,.15)" }}
              >
                {petName}
                <Pencil size={13} color="rgba(255,255,255,.85)" />
              </button>
            )}
          </div>

          {/* 液晶螢幕，點一下牠會開心跳一下 */}
          <div
            onClick={poke}
            style={{ background: "#4B3F33", borderRadius: 16, padding: 8, boxShadow: "inset 0 2px 6px rgba(0,0,0,.35)", cursor: "pointer" }}
          >
            <div style={{ borderRadius: 9, overflow: "hidden" }}>
              <PetLCD cols={32} rows={26} fullness={fullness} event={event} onEventDone={onEventDone} />
            </div>
          </div>

          {/* 飽足度愛心 */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }} aria-label={`飽足度 ${hearts} / 5`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <PixelHeart key={i} full={i < hearts} />
            ))}
          </div>

          {/* 三顆按鈕＝三種食物 */}
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 18 }}>
            {PET_FOODS.map((food) => {
              const disabled = busy || tooFull || stars < food.cost;
              return (
                <button
                  key={food.id}
                  onClick={() => feed(food)}
                  disabled={disabled}
                  style={{ border: "none", background: "none", padding: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, opacity: disabled ? 0.5 : 1 }}
                >
                  <span
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: "50%",
                      background: "#FFF9F2",
                      boxShadow: "inset 0 -4px 0 rgba(0,0,0,.12), 0 3px 0 rgba(0,0,0,.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 28,
                    }}
                  >
                    {food.emoji}
                  </span>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 12.5, textShadow: "0 1px 0 rgba(0,0,0,.2)" }}>
                    {food.name} {food.cost}⭐
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 16, fontWeight: 800, color: "#5A4632", fontSize: 15 }}>
          {statusLine()} <span style={{ color: "#B4A392", fontWeight: 700, fontSize: 13 }}>（飽足度 {Math.round(fullness)}%）</span>
        </div>
        {isNight() && !busy && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: "#94795F" }}>💤 晚上 9 點到早上 7 點牠在睡覺，餵牠會醒來吃</div>
        )}
        {msg && <div style={{ marginTop: 8, color: "#E85D5D", fontWeight: 700, fontSize: 13.5 }}>{msg}</div>}

        <div
          style={{
            marginTop: 14,
            width: "100%",
            maxWidth: 340,
            boxSizing: "border-box",
            background: giftDone ? "#F7F1E9" : "#FFF4E6",
            border: giftDone ? "none" : "2px dashed #F2C38F",
            borderRadius: 14,
            padding: "11px 14px",
            fontSize: 13.5,
            fontWeight: 700,
            color: giftDone ? "#94795F" : "#B86A1E",
            textAlign: "center",
          }}
        >
          {giftDone ? `今天的驚喜送過了：${pet?.last_gift_label || "🎁"}` : "🎁 今天第一次把牠餵到全飽，牠會送你一個驚喜！"}
        </div>

        <div style={{ marginTop: 18, width: "100%", maxWidth: 340, fontSize: 12, color: "#B4A392", lineHeight: 1.9 }}>
          · 用今日責任賺到的 ⭐ 買食物餵牠，大約兩天會從全飽變成肚子扁扁
          <br />· 每天第一次餵到全飽，會從獎勵轉盤的獎品裡送你一個驚喜
          <br />· 餵東西的時候偶爾也會撿到星星送你
          <br />· 點螢幕可以摸摸牠；餓扁了也不會不見，餵牠就會好起來
        </div>
      </div>

      {gift && <GiftReveal gift={gift} petName={petName} theme={theme} onClose={() => setGift(null)} />}
    </div>
  );
}

// 驚喜揭曉
function GiftReveal({ gift, petName, theme, onClose }) {
  const detail = gift.coupon
    ? "🎟️ 已經放進券夾，想用的時候再拿出來"
    : [gift.points ? `⭐ +${gift.points} 已經入帳` : "", gift.money ? `💰 +${gift.money} 元已經入帳` : ""].filter(Boolean).join("、");
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(60,45,30,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 320, background: "#fff", borderRadius: 22, padding: "24px 22px 20px", textAlign: "center", animation: "toastIn .25s ease-out" }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: "#B4A392" }}>
          {gift.kind === "daily" ? `${petName}吃得好飽，送你一個驚喜！` : `${petName}在草叢裡找到東西了！`}
        </div>
        <div style={{ fontSize: 60, lineHeight: 1.3, marginTop: 6 }}>{gift.emoji || "🎁"}</div>
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800, color: theme.accentDark }}>{gift.label}</div>
        {detail && <div style={{ fontSize: 12.5, color: "#8A7457", marginTop: 6, lineHeight: 1.6 }}>{detail}</div>}
        <button
          onClick={onClose}
          style={{ width: "100%", marginTop: 16, border: "none", borderRadius: 14, padding: 13, background: theme.accentDark, color: "#fff", fontWeight: 800, fontSize: 15 }}
        >
          謝謝{petName}！
        </button>
      </div>
    </div>
  );
}
