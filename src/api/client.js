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
export const updateChore = (choreId, name, amount, pin) => post("update_chore", { choreId, name, amount }, pin);
export const changePin = (newPin, pin) => post("change_pin", { newPin }, pin);

// ------- 生活責任 -------
export const toggleResponsibility = (kidId, responsibilityId) =>
  post("toggle_responsibility", { kidId, responsibilityId });
export const addResponsibility = (name, points, pin) => post("add_responsibility", { name, points }, pin);
export const deleteResponsibility = (responsibilityId, pin) => post("delete_responsibility", { responsibilityId }, pin);
export const updateResponsibility = (responsibilityId, name, points, pin) =>
  post("update_responsibility", { responsibilityId, name, points }, pin);

// ------- 特殊任務 -------
export const requestMissionComplete = (missionId) => post("request_mission_complete", { missionId });
export const addMission = (kidId, name, amount, pin) => post("add_mission", { kidId, name, amount }, pin);
export const approveMission = (missionId, pin) => post("approve_mission", { missionId }, pin);
export const rejectMission = (missionId, pin) => post("reject_mission", { missionId }, pin);
export const deleteMission = (missionId, pin) => post("delete_mission", { missionId }, pin);
export const updateMission = (missionId, name, amount, pin) => post("update_mission", { missionId, name, amount }, pin);

// ------- 責任值 / 違規紀錄 -------
export const awardPoints = (kidId, delta, reason, pin) => post("award_points", { kidId, delta, reason }, pin);
export const addViolation = (kidId, description, moneyDelta, pointsDelta, privilegeNote, pin) =>
  post("add_violation", { kidId, description, moneyDelta, pointsDelta, privilegeNote }, pin);

// ------- 固定零用錢 / 固定支出 / 利息 -------
export const addAllowanceRule = (kidId, amount, frequency, dayOfWeek, dayOfMonth, pin) =>
  post("add_allowance_rule", { kidId, amount, frequency, dayOfWeek, dayOfMonth }, pin);
export const deleteAllowanceRule = (ruleId, pin) => post("delete_allowance_rule", { ruleId }, pin);
export const updateAllowanceRule = (ruleId, amount, frequency, dayOfWeek, dayOfMonth, pin) =>
  post("update_allowance_rule", { ruleId, amount, frequency, dayOfWeek, dayOfMonth }, pin);
export const addExpenseRule = (kidId, name, amount, dayOfMonth, pin) =>
  post("add_expense_rule", { kidId, name, amount, dayOfMonth }, pin);
export const deleteExpenseRule = (ruleId, pin) => post("delete_expense_rule", { ruleId }, pin);
export const updateExpenseRule = (ruleId, name, amount, dayOfMonth, pin) =>
  post("update_expense_rule", { ruleId, name, amount, dayOfMonth }, pin);
export const setInterestRate = (kidId, rate, pin) => post("set_interest_rate", { kidId, rate }, pin);
