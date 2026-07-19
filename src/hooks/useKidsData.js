import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAllData, SITE_PIN_INVALID } from "../api/client";

// Neon 沒有像 Supabase 內建的 Realtime 訂閱功能，改用輪詢：
// 每 4 秒重新抓一次資料。對這種家庭小型 app 來說，
// 「家長審核後小孩幾秒內看到更新」已經足夠即時，不需要 WebSocket。
const POLL_INTERVAL = 4000;

// enabled：進站密碼驗證前不開始輪詢。onUnauthorized：輪詢途中
// 發現存在 localStorage 的全站密碼已經失效（例如家長在別的裝置
// 改過密碼），通知外層把使用者踢回登入畫面。
export function useKidsData(enabled = true, onUnauthorized) {
  const [kids, setKids] = useState([]);
  const [chores, setChores] = useState([]);
  const [pendingChores, setPendingChores] = useState([]);
  const [responsibilities, setResponsibilities] = useState([]);
  const [responsibilityLogs, setResponsibilityLogs] = useState([]);
  const [missions, setMissions] = useState([]);
  const [allowanceRules, setAllowanceRules] = useState([]);
  const [expenseRules, setExpenseRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const requestIdRef = useRef(0); // 用來丟棄比較舊、比較晚回來的輪詢結果，避免蓋掉剛做的操作

  const fetchAll = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const data = await fetchAllData();
      if (requestId !== requestIdRef.current) return; // 這個回應比後來發出的請求還舊，丟掉
      setKids(data.kids);
      setChores(data.chores);
      setPendingChores(data.pendingChores);
      setResponsibilities(data.responsibilities);
      setResponsibilityLogs(data.responsibilityLogs);
      setMissions(data.missions);
      setAllowanceRules(data.allowanceRules);
      setExpenseRules(data.expenseRules);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err.message === SITE_PIN_INVALID) {
        onUnauthorized?.();
        return;
      }
      console.error("讀取資料失敗", err);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [enabled, fetchAll]);

  return {
    kids,
    chores,
    pendingChores,
    responsibilities,
    responsibilityLogs,
    missions,
    allowanceRules,
    expenseRules,
    loading,
    refetch: fetchAll,
  };
}
