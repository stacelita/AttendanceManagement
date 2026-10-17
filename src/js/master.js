/**
 * ほとんど変わらないデータ（区分値・メンテナンス状態）の取得
 */
import { ACTION } from "./config.js";
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

/** 区分値の一覧 [{ value, name }] */
export function getCategories(kubunType) {
  return getFromGas(ACTION.GET_CATEGORY, { kubunType });
}
