/**
 * LIFF（LINE Front-end Framework）の操作
 * ※ liff は LIFF SDK のスクリプトで読み込まれるグローバル変数
 */

/**
 * LIFF を初期化する
 * @return {Promise<"ready"|"login"|"error">}
 *   ready：利用可能 / login：ログイン画面へ移動中（以降の処理は不要）/ error：初期化に失敗
 */
export async function initLiff(liffId) {
  try {
    await liff.init({ liffId });
  } catch (error) {
    console.error("LIFF初期化失敗", error);
    return "error";
  }
  if (!liff.isLoggedIn()) {
    liff.login();
    return "login";
  }
  return "ready";
}

/** LINEのプロフィール（userId・displayName） */
export function getLineProfile() {
  return liff.getProfile();
}

/**
 * LINEのIDトークン（GAS側で本人確認に使う）。取得できなければ null
 * ※LIFFアプリのスコープで openid が有効になっている必要がある
 */
export function getIdToken() {
  try {
    return liff.getIDToken() || null;
  } catch {
    return null;
  }
}

/** LINEアプリ内で開いている場合だけ、トークにメッセージを送る */
export async function sendMessageIfInClient(text) {
  if (liff.isInClient()) {
    await liff.sendMessages([{ type: "text", text }]);
  }
}

/** LIFF の画面を閉じる */
export function closeLiffWindow() {
  liff.closeWindow();
}
