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

const ID_TOKEN_EXPIRED_MESSAGE = "画面を開いてから時間が経ったため、送信できませんでした。\n画面を閉じて、もう一度開いてください。";
const ID_TOKEN_EXPIRY_MARGIN_MS = 60 * 1000; // 通信中に期限が切れないよう、1分の余裕を見る

/**
 * LINEのIDトークン（GAS側で本人確認に使う）。取得できなければ null
 * IDトークンには有効期限（発行から約1時間）があり、画面を開いたまま期限が切れていたら例外を投げる
 * ※LIFFアプリのスコープで openid が有効になっている必要がある
 */
export function getIdToken() {
  let idToken;
  let decoded;
  try {
    idToken = liff.getIDToken();
    decoded = liff.getDecodedIDToken();
  } catch {
    return null;
  }
  if (!idToken) return null;

  if (decoded && decoded.exp && decoded.exp * 1000 < Date.now() + ID_TOKEN_EXPIRY_MARGIN_MS) {
    throw new Error(ID_TOKEN_EXPIRED_MESSAGE);
  }
  return idToken;
}

/**
 * LINEアプリ内で開いている場合だけ、トークにメッセージを送る
 * 登録などの処理が終わったあとのお知らせなので、送れなくてもエラーにはしない
 */
export async function sendMessageIfInClient(text) {
  if (!liff.isInClient()) return;
  try {
    await liff.sendMessages([{ type: "text", text }]);
  } catch (error) {
    console.error("トークへの送信エラー:", error);
  }
}

/** LIFF の画面を閉じる */
export function closeLiffWindow() {
  liff.closeWindow();
}
