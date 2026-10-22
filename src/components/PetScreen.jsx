import React, { useEffect, useState } from "react";
import { ChevronLeft, Pencil, Check } from "lucide-react";
import { feedPet, renamePet, choosePet, hatchPet, resetPet } from "../api/client";
import { themeOf } from "../utils/format";
import PetLCD, { LCD_BG } from "./pet/PetLCD";
import PixelHeart from "./pet/PixelHeart";
import PinPadModal from "./PinPadModal";
import { SPECIES, SPECIES_ORDER, petFace } from "./pet/sprites";
import {
  PET_FOODS,
  PET_TOO_FULL,
  PET_SPECIES,
  PET_HATCH_TAPS,
  currentFullness,
  heartsOf,
  petStage,
  crackOf,
} from "../../lib/petRules.js";

const isNight = () => {
  const h = new Date().getHours();
  return h >= 21 || h < 7;
};

// 小寵物（電子雞）頁：用責任值星星買食物餵牠。
// 每天第一次餵到全飽會送一個驚喜（從獎勵轉盤的獎品抽），餵食時偶爾也會撿到星星。
// 一開始先選一顆蛋（刺蝟／兔子／小團子），點蛋幫牠取暖，點滿就孵出來。
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
  const [taps, setTaps] = useState(0); // 蛋被點了幾下（取暖）
  const [justHatched, setJustHatched] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const { stage, species } = petStage(pet);
  const speciesInfo = PET_SPECIES[species] || PET_SPECIES.dango;

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

  const onEventDone = async (evt) => {
    if (evt?.type === "hatch") {
      // 孵出來了：等資料更新成「已孵化」，再請小孩幫牠取名字
      await refetch();
      setBusy(false);
      setTaps(0);
      setJustHatched(true);
      setNameDraft(pet?.name || speciesInfo.defaultName);
      setEditingName(true);
      return;
    }
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
    if (stage === "egg") return warmEgg();
    if (stage === "hatched") setEvent({ id: Date.now(), type: "pet" });
  };

  // 點蛋取暖，點滿就孵化
  const warmEgg = async () => {
    const next = taps + 1;
    setTaps(next);
    if (next < PET_HATCH_TAPS) {
      setEvent({ id: Date.now(), type: "warm" });
      return;
    }
    setBusy(true);
    try {
      await hatchPet(kid.id);
      setEvent({ id: Date.now(), type: "hatch" });
    } catch (e) {
      setMsg(e.message || "孵化失敗，再點一次試試");
      setTaps(PET_HATCH_TAPS - 1);
      setBusy(false);
    }
  };

  const pickEgg = async (sp) => {
    const info = PET_SPECIES[sp];
    if (!window.confirm(`要選${info.name}的蛋嗎？\n選了之後要換，需要家長密碼喔`)) return;
    setBusy(true);
    try {
      await choosePet(kid.id, sp);
      await refetch();
      setTaps(0);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  // 換寵物：要家長密碼，密碼錯會丟錯讓 PinPadModal 顯示
  const doReset = async (parentPin) => {
    await resetPet(kid.id, parentPin);
    setShowResetPin(false);
    setJustHatched(false);
    await refetch();
    return true;
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

      {stage === "choose" ? (
        <EggPicker theme={theme} busy={busy} msg={msg} onPick={pickEgg} />
      ) : (
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
            {stage === "egg" ? (
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 17, textShadow: "0 1px 0 rgba(0,0,0,.15)" }}>
                {speciesInfo.name}的蛋
              </span>
            ) : editingName ? (
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
              <PetLCD
                cols={32}
                rows={26}
                fullness={fullness}
                species={species || "dango"}
                stage={stage}
                crack={crackOf(taps)}
                event={event}
                onEventDone={onEventDone}
              />
            </div>
          </div>

          {stage === "egg" ? (
            <div style={{ textAlign: "center", marginTop: 16, color: "#fff", textShadow: "0 1px 0 rgba(0,0,0,.2)" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }} aria-label={`取暖 ${taps} / ${PET_HATCH_TAPS}`}>
                {Array.from({ length: PET_HATCH_TAPS }).map((_, i) => (
                  <span
                    key={i}
                    style={{ width: 12, height: 12, borderRadius: 3, background: i < taps ? "#fff" : "rgba(255,255,255,.3)" }}
                  />
                ))}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, marginTop: 14 }}>👆 點蛋幫牠取暖</div>
              <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.9 }}>點 {PET_HATCH_TAPS} 下就會孵出來</div>
            </div>
          ) : (
          <>
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
          </>
          )}
        </div>

        {stage === "egg" ? (
          <div style={{ marginTop: 18, width: "100%", maxWidth: 340, fontSize: 13, color: "#8A7457", lineHeight: 1.8, textAlign: "center" }}>
            {speciesInfo.blurb}
            {msg && <div style={{ marginTop: 8, color: "#E85D5D", fontWeight: 700 }}>{msg}</div>}
          </div>
        ) : (
        <>
        {justHatched && (
          <div style={{ marginTop: 16, background: "#FFF4E6", borderRadius: 14, padding: "10px 14px", fontWeight: 800, color: "#B86A1E", fontSize: 14, textAlign: "center" }}>
            🎉 孵出來了！是一隻{speciesInfo.name}，幫牠取個名字吧
          </div>
        )}
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

        <button
          onClick={() => setShowResetPin(true)}
          style={{ marginTop: 18, border: "none", background: "none", color: "#C4B4A0", fontSize: 12.5, fontWeight: 700, textDecoration: "underline" }}
        >
          換一隻寵物（要家長密碼）
        </button>
        </>
        )}
      </div>
      )}

      {showResetPin && (
        <PinPadModal
          title="換一隻寵物"
          hint={"輸入家長密碼後會回到選蛋\n名字會保留，可以再改"}
          onSubmit={doReset}
          onClose={() => setShowResetPin(false)}
        />
      )}

      {gift && <GiftReveal gift={gift} petName={petName} theme={theme} onClose={() => setGift(null)} />}
    </div>
  );
}

// 靜態的像素小圖（選蛋畫面用）
function Sprite({ pts, w, h, size }) {
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" style={{ display: "block" }}>
      {pts.map(([x, y], i) => (
        <rect key={i} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} fill="#2F3A24" />
      ))}
    </svg>
  );
}

// 選一顆蛋：三種各一張卡，左邊是蛋、右邊是孵出來會長怎樣
function EggPicker({ theme, busy, msg, onPick }) {
  return (
    <div style={{ padding: "10px 18px 40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 22, color: theme.accentDark }}>選一顆蛋</div>
      <div style={{ fontSize: 13, color: "#8A7457", marginTop: 4, marginBottom: 16 }}>選好之後點蛋幫牠取暖，就會孵出來喔</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
        {SPECIES_ORDER.map((key) => {
          const art = SPECIES[key];
          const info = PET_SPECIES[key];
          const face = petFace(art, "open", "smile");
          return (
            <button
              key={key}
              onClick={() => onPick(key)}
              disabled={busy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                border: `2px solid ${theme.accent}`,
                borderRadius: 18,
                background: "#fff",
                padding: 12,
                textAlign: "left",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <div style={{ background: LCD_BG, borderRadius: 12, padding: "10px 12px", flexShrink: 0 }}>
                <Sprite {...art.egg} size={44} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#5A4632" }}>{info.name}</div>
                <div style={{ fontSize: 12, color: "#94795F", marginTop: 3, lineHeight: 1.6 }}>{info.blurb}</div>
              </div>
              <div style={{ background: LCD_BG, borderRadius: 10, padding: 6, flexShrink: 0, opacity: 0.85 }}>
                <Sprite pts={[...art.body.pts, ...face]} w={16} h={16} size={34} />
              </div>
            </button>
          );
        })}
      </div>
      {msg && <div style={{ marginTop: 12, color: "#E85D5D", fontWeight: 700, fontSize: 13.5 }}>{msg}</div>}
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
