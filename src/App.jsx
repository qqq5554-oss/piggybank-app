import React, { useState } from "react";
import { useKidsData } from "./hooks/useKidsData";
import HomeScreen from "./components/HomeScreen";
import KidDetailScreen from "./components/KidDetailScreen";
import ParentPinScreen from "./components/ParentPinScreen";
import ParentDashboard from "./components/ParentDashboard";

// 畫面流程：
// home（選小孩）→ kidDetail（小孩自己的帳戶）
// home → parentPinEntry（輸入密碼）→ parentDashboard（家長後台）
export default function App() {
  const { kids, chores, pendingChores, loading, refetch } = useKidsData();
  const [screen, setScreen] = useState("home");
  const [activeKidId, setActiveKidId] = useState(null);
  const [parentPin, setParentPin] = useState(null); // 驗證成功的 PIN，家長後台的寫入操作要帶著它

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        🐷 存錢筒開機中...
      </div>
    );
  }

  const activeKid = kids.find((k) => k.id === activeKidId) || null;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
      {screen === "home" && (
        <HomeScreen
          kids={kids}
          onSelectKid={(id) => {
            setActiveKidId(id);
            setScreen("kidDetail");
          }}
          onParentClick={() => setScreen("parentPinEntry")}
        />
      )}

      {screen === "kidDetail" && activeKid && (
        <KidDetailScreen
          kid={activeKid}
          chores={chores}
          pendingChores={pendingChores.filter((p) => p.kid_id === activeKid.id)}
          onBack={() => setScreen("home")}
          refetch={refetch}
        />
      )}

      {screen === "parentPinEntry" && (
        <ParentPinScreen
          onBack={() => setScreen("home")}
          onSuccess={(pin) => {
            setParentPin(pin);
            setScreen("parentDashboard");
          }}
        />
      )}

      {screen === "parentDashboard" && (
        <ParentDashboard
          kids={kids}
          chores={chores}
          pendingChores={pendingChores}
          pin={parentPin}
          onBack={() => {
            setParentPin(null);
            setScreen("home");
          }}
          refetch={refetch}
        />
      )}
    </div>
  );
}
