import React, { useState, useCallback, useEffect } from "react";
import { useKidsData } from "./hooks/useKidsData";
import SwipeBackShell from "./components/SwipeBackShell";
import { getSitePin, clearSitePin } from "./api/client";
import { registerServiceWorker } from "./utils/push";
import HomeScreen from "./components/HomeScreen";
import KidDetailScreen from "./components/KidDetailScreen";
import ParentDashboard from "./components/ParentDashboard";
import SiteAccessScreen from "./components/SiteAccessScreen";
import QuickRecordScreen from "./components/QuickRecordScreen";
import TodayResponsibilityScreen from "./components/TodayResponsibilityScreen";
import ChallengeScreen from "./components/ChallengeScreen";
import SpinWheelScreen from "./components/SpinWheelScreen";
import FocusTimerScreen from "./components/FocusTimerScreen";

// 畫面流程（家長 PIN 已取消，只留進站密碼當大門）：
// siteLocked（進站密碼）→ home（兩張大卡片 + 常用功能）
// 卡片上的功能各自進到獨立畫面：
//   今日責任 → todayResponsibility（打卡＋兌換獎勵）
//   支出／收入／責任 → quickRecord（數字鍵盤記一筆）
//   挑戰 → challenge
// 點卡片本身 → kidDetail（完整帳戶頁）；右上齒輪 → manage（管理）
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
    challenges,
    wheelOptions,
    rewardWheelOptions,
    rewardSpins,
    coupons,
    vapidPublicKey,
    today,
    loading,
    refetch,
  } = useKidsData(siteUnlocked, handleUnauthorized);

  const [screen, setScreen] = useState("home");
  const [activeKidId, setActiveKidId] = useState(null);
  const [quickTab, setQuickTab] = useState("expense");

  // 一進來就先註冊 Service Worker，之後要開推播通知才不用等
  useEffect(() => {
    if (siteUnlocked) registerServiceWorker();
  }, [siteUnlocked]);

  const goHome = useCallback(() => setScreen("home"), []);

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

  // 首頁卡片上的常用功能按鈕
  const handleAction = (kidId, actionId) => {
    setActiveKidId(kidId);
    if (actionId === "today") return setScreen("todayResponsibility");
    if (actionId === "challenge") return setScreen("challenge");
    setQuickTab(actionId === "points" ? "points" : actionId); // expense / income / points
    setScreen("quickRecord");
  };

  const homeScreen = (
    <HomeScreen
      kids={kids}
      responsibilities={responsibilities}
      responsibilityLogs={responsibilityLogs}
      challenges={challenges}
      today={today}
      onSelectKid={(id) => {
        setActiveKidId(id);
        setScreen("kidDetail");
      }}
      onAction={handleAction}
      onManage={() => setScreen("manage")}
      onWheel={() => setScreen("wheel")}
      onTimer={() => setScreen("timer")}
    />
  );

  let subScreen = null;
  if (screen === "todayResponsibility" && activeKid) {
    subScreen = (
      <TodayResponsibilityScreen
        kid={activeKid}
        responsibilities={responsibilities.filter((r) => r.kid_id === activeKid.id)}
        responsibilityLogs={responsibilityLogs.filter((l) => l.kid_id === activeKid.id)}
        rewardItems={rewardItems}
        rewardWheelOptions={rewardWheelOptions}
        todaySpin={rewardSpins.find((s) => s.kid_id === activeKid.id) || null}
        coupons={coupons.filter((c) => c.kid_id === activeKid.id)}
        today={today}
        onBack={goHome}
        refetch={refetch}
      />
    );
  } else if (screen === "challenge" && activeKid) {
    subScreen = (
      <ChallengeScreen
        kid={activeKid}
        challenges={challenges.filter((c) => c.kid_id === activeKid.id)}
        onBack={goHome}
        refetch={refetch}
      />
    );
  } else if (screen === "quickRecord") {
    subScreen = (
      <QuickRecordScreen
        kids={kids}
        pin={null}
        initialKidId={activeKidId}
        initialTab={quickTab}
        onClose={goHome}
        refetch={refetch}
      />
    );
  } else if (screen === "kidDetail" && activeKid) {
    subScreen = (
      <KidDetailScreen
        kid={activeKid}
        chores={chores}
        responsibilities={responsibilities.filter((r) => r.kid_id === activeKid.id)}
        responsibilityLogs={responsibilityLogs.filter((l) => l.kid_id === activeKid.id)}
        missions={missions.filter((m) => m.kid_id === activeKid.id)}
        rewardItems={rewardItems}
        today={today}
        onBack={goHome}
        refetch={refetch}
      />
    );
  } else if (screen === "wheel") {
    subScreen = <SpinWheelScreen wheelOptions={wheelOptions} kids={kids} onBack={goHome} refetch={refetch} />;
  } else if (screen === "timer") {
    subScreen = <FocusTimerScreen onBack={goHome} />;
  } else if (screen === "manage") {
    subScreen = (
      <ParentDashboard
        kids={kids}
        chores={chores}
        pendingChores={pendingChores}
        responsibilities={responsibilities}
        missions={missions}
        allowanceRules={allowanceRules}
        expenseRules={expenseRules}
        rewardItems={rewardItems}
        rewardWheelOptions={rewardWheelOptions}
        vapidPublicKey={vapidPublicKey}
        pin={null}
        onBack={goHome}
        refetch={refetch}
      />
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      {subScreen ? (
        <SwipeBackShell background={homeScreen} onBack={goHome}>
          {subScreen}
        </SwipeBackShell>
      ) : (
        homeScreen
      )}
    </div>
  );
}
