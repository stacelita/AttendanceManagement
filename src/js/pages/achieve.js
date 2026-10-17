/**
 * 勤務実績入力ページ
 */
import { ACTION, KUBUN, LIFF_ID } from "../config.js";
import { postToGas } from "../api.js";
import { isMaintenance, getCategories } from "../master.js";
import { initLiff, getLineProfile, getIdToken, sendMessageIfInClient, closeLiffWindow } from "../liff-client.js";
import {
  getEl, hideOverlay, showOverlay, showLoadError, showModal, showMaintenancePage,
  checkRequired, preventSubmitOnEnter, setSelectOptions, addNumberOptions, range,
} from "../ui.js";

const LOAD_ERROR_MESSAGE = "読み込みに失敗しました。再読み込みしてください。";
const MAX_ITEM_COUNT = 10; // 獲得項目の数量の上限

setupAchievePage();

async function setupAchievePage() {
  preventSubmitOnEnter();
  const today = new Date().toLocaleDateString("sv-SE"); // yyyy-MM-dd（端末の日付）

  // 互いに待つ必要のない処理は、ページを開いた時点で同時に始める
  const maintenance = isMaintenance();
  const workCategories = getCategories(KUBUN.WORK_CATEGORY);
  const workItems = getCategories(KUBUN.WORK_ITEM);
  const liffState = initLiff(LIFF_ID.ACHIEVE);
  // 勤務場所はログイン（LIFFの初期化）が済んだらすぐ取りに行く
  const todayStore = liffState.then((state) => (state === "ready" ? fetchAssignedStore(today) : null));

  // メンテナンス中ならほかの結果は使わない（後で失敗しても警告を出さない）
  [workCategories, workItems, todayStore].forEach((p) => p.catch(() => {}));
  if (await maintenance) {
    showMaintenancePage();
    return;
  }

  const state = await liffState;
  if (state === "login") return; // ログイン画面へ移動中
  if (state === "error") {
    showLoadError(LOAD_ERROR_MESSAGE);
    return;
  }

  getEl("datePicker").value = today;
  try {
    await Promise.all([
      todayStore.then((location) => showLocation(location)),
      workCategories.then((list) => setSelectOptions(getEl("workCategory"), list)),
      workItems.then(renderWorkItems, (error) => {
        getEl("workItemList").innerHTML = '<div class="list-group-item text-danger">データの取得に失敗しました</div>';
        throw error;
      }),
    ]);
    hideOverlay();
  } catch (error) {
    console.error("初期化エラー:", error);
    showLoadError(LOAD_ERROR_MESSAGE);
  }

  getEl("datePicker").addEventListener("change", (e) => refreshLocation(e.target.value));
  getEl("workForm").addEventListener("submit", submitAchievement);
}

// --- 勤務場所 ---

// 日付を続けて変えたとき、古い日付の結果で表示を上書きしないための番号
let locationRequestId = 0;

/** 指定日の勤務場所を取得（取得に失敗したら "エラー"） */
async function fetchAssignedStore(date) {
  try {
    const profile = await getLineProfile();
    const data = await postToGas(
      ACTION.GET_ASSIGNED_STORE,
      { userId: profile.userId, targetDate: date },
      getIdToken()
    );
    return data && data.location ? data.location : "シフトなし";
  } catch (error) {
    console.error("シフト取得エラー:", error);
    return "エラー";
  }
}

function showLocation(location) {
  getEl("locationDisplay").innerText = location;
}

async function refreshLocation(date) {
  const requestId = ++locationRequestId;
  showLocation("読み込み中...");
  const location = await fetchAssignedStore(date);
  if (requestId === locationRequestId) showLocation(location);
}

// --- 獲得項目 ---

/** 獲得項目ごとに、数量（0〜10）のプルダウンを並べる */
function renderWorkItems(items) {
  const container = getEl("workItemList");
  container.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "list-group-item d-flex justify-content-between align-items-center py-3";

    const name = document.createElement("span");
    name.className = "fw-bold text-secondary";
    name.textContent = item.name;

    const count = document.createElement("select");
    count.className = "form-select form-select-sm w-auto item-count-select";
    count.dataset.itemId = item.value;
    count.dataset.itemName = item.name;
    addNumberOptions(count, range(0, MAX_ITEM_COUNT), String);

    row.append(name, count);
    container.appendChild(row);
  });
}

/** 入力された獲得項目と数量 */
function getSelectedItems() {
  return Array.from(document.querySelectorAll(".item-count-select")).map((select) => ({
    id: select.dataset.itemId,
    name: select.dataset.itemName,
    count: Number(select.value),
  }));
}

// --- 送信 ---

async function submitAchievement(e) {
  e.preventDefault();
  if (!checkRequired([getEl("datePicker"), getEl("workCategory")])) return;

  const isOverwrite = getEl("overwriteCheck").checked;
  if (isOverwrite && !confirm("既に登録されている場合は情報が上書きされます。よろしいですか？")) return;

  showOverlay("送信中...");
  try {
    const profile = await getLineProfile();
    const categorySelect = getEl("workCategory");
    const items = getSelectedItems();
    const achievement = {
      userId: profile.userId,
      userName: profile.displayName,
      date: getEl("datePicker").value,
      store: getEl("locationDisplay").textContent,
      categoryValue: categorySelect.value,
      items,
      uniqueProducts: getEl("uniqueProducts").value.trim(),
      memo: getEl("memo").value.trim(),
      isOverwrite,
    };

    await postToGas(ACTION.RECORD_ACHIEVE, achievement, getIdToken());

    await sendMessageIfInClient(buildReportMessage(achievement, categorySelect.options[categorySelect.selectedIndex]?.text || ""));
    hideOverlay();
    await showModal("登録が完了しました！");
    closeLiffWindow();
  } catch (error) {
    hideOverlay();
    await showModal(error.message || "エラーが発生しました。");
  }
}

/** 登録内容をトークに送る文面 */
function buildReportMessage(achievement, categoryName) {
  const itemsText = achievement.items.length > 0
    ? achievement.items.map((item) => `${item.name}: ${item.count}`).join("\n")
    : "なし";

  return `【勤務実績登録】\n` +
    `日付：${achievement.date}\n` +
    `勤務場所：${achievement.store}\n` +
    `稼働内容：${categoryName}\n` +
    `--- 獲得項目 ---\n` +
    `${itemsText}\n` +
    `----------------\n` +
    `独自商材：${achievement.uniqueProducts || "なし"}\n` +
    `備考：${achievement.memo || "なし"}`;
}
