/**
 * スタッフ情報登録ページ
 */
import { ACTION, LIFF_ID } from "../config.js";
import { postToGas } from "../api.js";
import { isMaintenance } from "../master.js";
import { initLiff, getLineProfile, getIdToken, sendMessageIfInClient, closeLiffWindow } from "../liff-client.js";
import {
  getEl, hideOverlay, showOverlay, showLoadError, showModal, showMaintenancePage,
  checkRequired, preventSubmitOnEnter, addNumberOptions, range, pad2,
} from "../ui.js";

const LOAD_ERROR_MESSAGE = "読み込みに失敗しました。再読み込みしてください。";
const BIRTH_YEAR_FROM = 1940;

setupProfilePage();

async function setupProfilePage() {
  preventSubmitOnEnter();
  setupBirthDateSelects();

  // メンテナンス判定と LIFF の初期化は同時に始め、ログインが済んだらすぐ登録済みの情報を取りに行く
  const maintenance = isMaintenance();
  const liffState = initLiff(LIFF_ID.PROFILE);
  const savedProfile = liffState.then((state) => (state === "ready" ? fetchSavedProfile() : null));

  savedProfile.catch(() => {}); // メンテナンス中で使わなかった場合に警告を出さない
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

  try {
    const profile = await savedProfile;
    if (profile) showRegisteredProfile(profile);
    hideOverlay();
  } catch (error) {
    console.error("初期化エラー:", error);
    showLoadError(LOAD_ERROR_MESSAGE);
  }

  getEl("staffForm").addEventListener("submit", submitProfile);
}

/** 登録済みのスタッフ情報（未登録なら null） */
async function fetchSavedProfile() {
  const lineProfile = await getLineProfile();
  const data = await postToGas(ACTION.GET_PROFILE, { userId: lineProfile.userId }, getIdToken());
  return data.profile;
}

/** 登録済みの内容を表示し、登録ボタンを隠して「変更は管理者へ」の案内を出す */
function showRegisteredProfile(profile) {
  getEl("userName").value = profile.name || "";
  getEl("userKana").value = profile.furigana || "";
  getEl("station").value = profile.station || "";
  getEl("tel").value = profile.phone || "";

  const [year, month, day] = String(profile.birthday || "").slice(0, 10).split("-");
  getEl("birthYear").value = year || "";
  getEl("birthMonth").value = month || "";
  getEl("birthDay").value = day || "";

  getEl("submitBtn").classList.add("d-none");
  getEl("infoMessage").classList.remove("d-none");
}

// --- 生年月日 ---

function setupBirthDateSelects() {
  addNumberOptions(getEl("birthYear"), range(new Date().getFullYear(), BIRTH_YEAR_FROM), (y) => `${y}年`);
  addNumberOptions(getEl("birthMonth"), range(1, 12), (m) => `${m}月`, pad2);
  addNumberOptions(getEl("birthDay"), range(1, 31), (d) => `${d}日`, pad2);
}

/** 生年月日（yyyy-MM-dd）。未選択の項目があれば null */
function getBirthDate() {
  const year = getEl("birthYear").value;
  const month = getEl("birthMonth").value;
  const day = getEl("birthDay").value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

// --- 送信 ---

async function submitProfile(e) {
  e.preventDefault();
  const required = ["userName", "userKana", "birthYear", "birthMonth", "birthDay", "station", "tel"].map(getEl);
  if (!checkRequired(required)) return;

  showOverlay("送信中...");
  try {
    const lineProfile = await getLineProfile();
    const staff = {
      userId: lineProfile.userId,
      displayName: lineProfile.displayName,
      userName: getEl("userName").value.trim(),
      userKana: getEl("userKana").value.trim(),
      birthDate: getBirthDate(),
      station: getEl("station").value.trim(),
      tel: getEl("tel").value.trim(),
    };

    await postToGas(ACTION.RECORD_PROFILE, staff, getIdToken());

    await sendMessageIfInClient(
      `【スタッフ情報登録】\n` +
      `氏名：${staff.userName}\n` +
      `フリガナ：${staff.userKana}\n` +
      `生年月日：${staff.birthDate}\n` +
      `最寄り駅：${staff.station}\n` +
      `電話番号：${staff.tel}`
    );
    hideOverlay();
    await showModal("登録が完了しました！");
    closeLiffWindow();
  } catch (error) {
    hideOverlay();
    await showModal(error.message || "エラーが発生しました。");
  }
}
