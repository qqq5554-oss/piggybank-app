import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAllData } from "../api/client";

// Neon 沒有像 Supabase 內建的 Realtime 訂閱功能，改用輪詢：
// 每 4 秒重新抓一次資料。對這種家庭小型 app 來說，
// 「家長審核後小孩幾秒內看到更新」已經足夠即時，不需要 WebSocket。
const POLL_INTERVAL = 4000;

export function useKidsData() {
  const [kids, setKids] = useState([]);
  const [chores, setChores] = useState([]);
  const [pendingChores, setPendingChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetchAllData();
      setKids(data.kids);
      setChores(data.chores);
      setPendingChores(data.pendingChores);
    } catch (err) {
      console.error("讀取資料失敗", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  return { kids, chores, pendingChores, loading, refetch: fetchAll };
}
