/**
 * GASの呼び出し
 *
 * ・GET ：個人のデータを扱わない取得（区分値・メンテナンス状態）。IDトークンはURLに載せないため付けない
 * ・POST：個人のデータを扱う処理。IDトークンを付けて、GAS側で本人確認する
 * ・どちらも部署コード（dept）を付ける
 * ・GASが { status: "error" } を返したら、その message で例外を投げる
 */
import { DEPT, GAS_URL } from "./config.js";

const SERVER_ERROR_MESSAGE = "サーバーとの通信に失敗しました。時間をおいて、もう一度お試しください。";

/**
 * GET で呼び出す
 * @param {string} action
 * @param {Object} [params]
 */
export async function getFromGas(action, params = {}) {
  const search = new URLSearchParams({ action });
  if (DEPT) search.set("dept", DEPT);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });

  const response = await fetch(`${GAS_URL}?${search.toString()}`, { method: "GET" });
  return parseResponse(response);
}

/**
 * POST で呼び出す
 * @param {string} action
 * @param {Object} params
 * @param {string|null} idToken LINEのIDトークン（GAS側の本人確認に使う）
 */
export async function postToGas(action, params, idToken) {
  const body = { action, ...params };
  if (DEPT) body.dept = DEPT;
  if (idToken) body.idToken = idToken;

  // Content-Type を指定しないことで、GASが受け付けない「プリフライトリクエスト」を避ける
  const response = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  if (!response.ok) {
    throw new Error(`${SERVER_ERROR_MESSAGE}（HTTP ${response.status}）`);
  }

  let data;
  try {
    data = JSON.parse(await response.text());
  } catch {
    // GASが処理中にエラーになるとJSONではない応答が返る
    throw new Error(SERVER_ERROR_MESSAGE);
  }

  if (data && data.status === "error") {
    throw new Error(data.message || "サーバーでエラーが発生しました。");
  }
  return data;
}
