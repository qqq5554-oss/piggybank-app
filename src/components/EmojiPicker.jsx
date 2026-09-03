import React, { useState, useRef, useEffect } from "react";

// 常用的幾組，照「小孩會用到的情境」分類，不做完整 emoji 鍵盤，
// 太多反而找不到；找不到想要的可以在下面自己貼一個。
const GROUPS = [
  { name: "獎勵", list: ["🎁", "🏆", "⭐", "🎉", "🎫", "💰", "💵", "🪙", "❓", "💎"] },
  { name: "吃的", list: ["🍬", "🍭", "🍫", "🍪", "🧁", "🍦", "🍩", "🍰", "🥤", "🧋", "🍿", "🍎", "🍓", "🍇", "🍜", "🍕"] },
  { name: "玩的", list: ["🎮", "🕹️", "🎲", "🎯", "🎡", "🎢", "🎠", "🧩", "🪀", "⚽", "🏀", "🛝", "🎨", "🎤", "🎸", "🧸"] },
  { name: "特權", list: ["📺", "📱", "🎬", "⏰", "🛌", "🌙", "🚗", "🚲", "🏖️", "🐶", "🐱", "📖", "👕", "🛒", "🍽️", "🧑‍🍳"] },
  { name: "家事", list: ["🧹", "🧺", "🧼", "🗑️", "🛏️", "🪥", "🚿", "📚", "✏️", "👟", "🪴", "🧦"] },
];

// 選項前面的小小 emoji 選擇器：按一下開一個面板挑，也可以自己貼一個。
export default function EmojiPicker({ value, onChange, size = 44 }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const boxRef = useRef(null);

  // 點到面板外面就關起來
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  const pick = (emoji) => {
    onChange(emoji);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="選一個 emoji"
        style={{
          width: size,
          height: size,
          borderRadius: 12,
          border: `2px ${value ? "solid" : "dashed"} ${value ? "#F1E7DC" : "#D8C6B0"}`,
          background: "#fff",
          fontSize: value ? 22 : 15,
          lineHeight: 1,
          color: "#B4A392",
          padding: 0,
        }}
      >
        {value || "＋"}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: size + 6,
            left: 0,
            zIndex: 30,
            width: 268,
            maxWidth: "78vw",
            maxHeight: 260,
            overflowY: "auto",
            background: "#fff",
            border: "2px solid #F1E7DC",
            borderRadius: 14,
            padding: 10,
            boxShadow: "0 10px 26px rgba(90,70,50,.18)",
          }}
        >
          {GROUPS.map((g) => (
            <div key={g.name} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#B4A392", marginBottom: 4 }}>{g.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
                {g.list.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => pick(e)}
                    style={{
                      border: "none",
                      background: value === e ? "#F1E7DC" : "none",
                      borderRadius: 8,
                      fontSize: 19,
                      lineHeight: 1,
                      padding: "5px 0",
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 6, alignItems: "center", borderTop: "1px solid #F7F1E9", paddingTop: 8 }}>
            <input
              value={custom}
              onChange={(e) => setCustom([...e.target.value].slice(0, 2).join(""))}
              placeholder="或自己貼一個"
              style={{ flex: 1, minWidth: 0, border: "2px solid #F1E7DC", borderRadius: 10, padding: "7px 9px", fontSize: 14, outline: "none" }}
            />
            <button
              type="button"
              onClick={() => custom.trim() && pick(custom.trim())}
              style={{ border: "none", borderRadius: 10, padding: "8px 11px", background: "#E86A3A", color: "#fff", fontWeight: 800, fontSize: 12.5 }}
            >
              用這個
            </button>
          </div>

          {value && (
            <button
              type="button"
              onClick={() => pick("")}
              style={{ width: "100%", marginTop: 6, border: "none", borderRadius: 10, padding: 7, background: "#F7F1E9", color: "#B4A392", fontWeight: 700, fontSize: 12.5 }}
            >
              不用 emoji（盤面上顯示文字）
            </button>
          )}
        </div>
      )}
    </div>
  );
}
