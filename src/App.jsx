import React, { useState, useCallback } from "react";
import { useKidsData } from "./hooks/useKidsData";
import { getSitePin, clearSitePin } from "./api/client";
import HomeScreen from "./components/HomeScreen";
import KidDetailScreen from "./components/KidDetailScreen";
import ParentPinScreen from "./components/ParentPinScreen";
import ParentDashboard from "./components/ParentDashboard";
import SiteAccessScreen from "./components/SiteAccessScreen";

// 畫面流程：
// siteLocked（進站密碼）→ home（選小孩）→ kidDetail（小孩自己的帳戶）
// home → parentPinEntry（輸入密碼）→ parentDashboard（家長後台）
export default function App() {
  const [siteUnlocked, setSiteUnlocked] = useState(!!getSitePin());
  const handleUnauthorized = useCallback(() => {
    clearSitePin();
    setSiteUnlocked(false);
  }, []);

  const {
    kids,
    chores,
    pendingChores,
    responsibilities,
    responsibilityLogs,
    missions,
    allowanceRules,
    expenseRules,
    rewardItems,
    today,
    loading,
    refetch,
  } = useKidsData(siteUnlocked, handleUnauthorized);
  const [screen, setScreen] = useState("home");
  const [activeKidId, setActiveKidId] = useState(null);
  const [parentPin, setParentPin] = useState(null); // 驗證成功的 PIN，家長後台的寫入操作要帶著它

  if (!siteUnlocked) {
    return <SiteAccessScreen onSuccess={() => setSiteUnlocked(true)} />;
  }

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
          responsibilities={responsibilities}
          responsibilityLogs={responsibilityLogs.filter((l) => l.kid_id === activeKid.id)}
          missions={missions.filter((m) => m.kid_id === activeKid.id)}
          rewardItems={rewardItems}
          today={today}
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
          responsibilities={responsibilities}
          missions={missions}
          allowanceRules={allowanceRules}
          expenseRules={expenseRules}
          rewardItems={rewardItems}
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
