/**
 * ほとんど変わらないデータ（区分値・メンテナンス状態）の取得
 */
import { ACTION, DEPT } from "./config.js";
import { getFromGas } from "./api.js";

/**
 * メンテナンス中か
 * 判定の通信に失敗した場合は、利用を止めないように「メンテナンス中ではない」として扱う
 */
export async function isMaintenance() {
  try {
    const data = await getFromGas(ACTION.IS_MAINTENANCE);
    return !!(data && data.is_maintenance);
  } catch (error) {
    console.error("メンテナンス確認エラー:", error);
    return false;
  }
}

/**
 * 区分値の一覧 [{ value, name }]
 *
 * 前回取得した内容をブラウザに保存しておき、あればすぐにそれを返す（2回目以降の表示を速くするため）。
 * 同時にサーバーから最新を取り直して保存し、次回に反映する。
 * 保存がなければ、サーバーから取得して返す。
 */
export async function getCategories(kubunType) {
  const storageKey = `liff:categories:${DEPT || "SALES1"}:${kubunType}`;
  const latest = getFromGas(ACTION.GET_CATEGORY, { kubunType }).then((list) => {
    saveToStorage(storageKey, list);
    return list;
  });

  const saved = loadFromStorage(storageKey);
  if (saved) {
    latest.catch((error) => console.error("区分値の更新エラー:", error));
    return saved;
  }
  return latest;
}

function loadFromStorage(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できない環境（プライベートモードなど）では保存しない
  }
}
