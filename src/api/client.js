// 前端只透過這幾支函式跟後端溝通，完全不碰資料庫連線細節。
// 家長密碼在需要時由呼叫端傳入，送到後端驗證，不在前端比對。

async function post(action, payload = {}, pin = null) {
  const res = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, pin, payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "操作失敗");
  return data;
}

export async function fetchAllData() {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error("資料讀取失敗");
  return res.json(); // { kids, chores, pendingChores }
}

export async function fetchTransactions(kidId) {
  const res = await fetch(`/api/transactions?kidId=${kidId}`);
  if (!res.ok) throw new Error("資料讀取失敗");
  const data = await res.json();
  return data.transactions;
}

export const requestChore = (kidId, chore) =>
  post("request_chore", { kidId, choreId: chore.id, choreName: chore.name, amount: chore.amount });

export const setGoal = (kidId, goal) =>
  post("set_goal", { kidId, goalName: goal?.name || null, goalAmount: goal?.amount || null });

export const verifyPin = (pin) => post("verify_pin", {}, pin).then((d) => d.ok);

export const approveChore = (pendingId, pin) => post("approve_chore", { pendingId }, pin);
export const rejectChore = (pendingId, pin) => post("reject_chore", { pendingId }, pin);
export const adjustBalance = (kidId, type, amount, note, pin) =>
  post("adjust_balance", { kidId, type, amount, note }, pin);
export const addKid = (name, avatar, themeId, pin) => post("add_kid", { name, avatar, themeId }, pin);
export const updateKid = (kidId, fields, pin) => post("update_kid", { kidId, ...fields }, pin);
export const addChore = (name, amount, pin) => post("add_chore", { name, amount }, pin);
export const deleteChore = (choreId, pin) => post("delete_chore", { choreId }, pin);
export const changePin = (newPin, pin) => post("change_pin", { newPin }, pin);
