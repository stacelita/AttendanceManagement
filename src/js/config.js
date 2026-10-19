/**
 * 設定
 *
 * 部署ごとの設定は、LIFFアプリの「エンドポイントURL」のパラメータで受け取る（ページは全部署で共通）
 *   例）.../pages/achieve/?dept=SALES1&liffId=xxxxxxxxxx-xxxxxxxx
 *   dept・liffId のどちらかがなければ、画面に設定エラーを表示して止める（既定の部署はない）
 */

const pageParams = new URLSearchParams(window.location.search);

/** 部署コード（エンドポイントURLの dept） */
export const DEPT = pageParams.get("dept") || "";

/** このページの LIFF ID（エンドポイントURLの liffId） */
export const LIFF_ID = pageParams.get("liffId") || "";

/** 設定の不足（dept・liffId がそろっていれば null。足りなければ画面に出す文言） */
export const CONFIG_ERROR = DEPT && LIFF_ID
  ? null
  : "画面の設定に誤りがあるため、表示できません。管理者に連絡してください。（LIFFアプリのエンドポイントURLに dept と liffId が必要です）";

/** 呼び出すGASのURL（全部署で共通） */
export const GAS_URL = "https://script.google.com/macros/s/AKfycbyhNwPwFZrsfIZAwHQTGaTPq6E-0mt4nLnLNYXmHkIizT9kDXeRfN5HApwYwGlTpawp/exec";

/** GASの処理名（action） */
export const ACTION = {
  GET_PAGE_DATA: "get_page_data", // メンテナンス状態と区分値をまとめて取得
  GET_ASSIGNED_STORE: "get_assigned_store",
  RECORD_ACHIEVE: "record_achieve",
  RECORD_PROFILE: "record_profile",
  GET_PROFILE: "get_profile", // 登録済みのスタッフ情報とメンテナンス状態
};

/** 定数シートの区分ID */
export const KUBUN = {
  WORK_CATEGORY: "1", // 稼働内容
  WORK_ITEM: "2",     // 獲得項目
};
