/**
 * 画面の表示に必要なデータ（メンテナンス状態・区分値）の取得
 */
import { ACTION } from "./config.js";
import { getFromGas } from "./api.js";

/**
 * メンテナンス状態と区分値を、GAS の1回の呼び出しでまとめて取得する
 * @param {string[]} kubunTypes 区分ID
 * @return {Promise<{isMaintenance: boolean, categories: Object<string, Array<{value: string, name: string}>>}>}
 */
export async function getPageData(kubunTypes) {
  const data = await getFromGas(ACTION.GET_PAGE_DATA, { kubunTypes: kubunTypes.join(",") });
  return {
    isMaintenance: !!data.is_maintenance,
    categories: data.categories || {},
  };
}
