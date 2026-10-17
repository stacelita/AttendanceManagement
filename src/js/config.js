/**
 * 設定
 *
 * 部署ごとの設定は、LIFFアプリの「エンドポイントURL」のパラメータで受け取る（ページは全部署で共通）
 *   例）.../pages/achieve/?dept=SALES2&liffId=xxxxxxxxxx-xxxxxxxx
 *   パラメータがなければ第1営業部（従来の設定）として動く
 */

const pageParams = new URLSearchParams(window.location.search);

/** 部署コード（第1営業部は空） */
export const DEPT = pageParams.get("dept") || "";

const liffIdFromUrl = pageParams.get("liffId") || "";

/** LIFF ID（URLで指定がなければ第1営業部のもの） */
export const LIFF_ID = {
  ACHIEVE: liffIdFromUrl || "2008956543-HV2ZIzKe",
  PROFILE: liffIdFromUrl || "2008956543-MaLNj6aF",
};

// 第1営業部が共通のGASへ移行するまでは、部署の指定がなければ従来のGASを使う
const GAS_URL_LEGACY = "https://script.google.com/macros/s/AKfycbx_N2GjqMIPN9iiIh94CPXOF3Ri4gHK4QOhDT3d4rUKGQ__uKMhVWGv3esx6LqF6Ssr2Q/exec";
const GAS_URL_SHARED = "https://script.google.com/macros/s/AKfycbyhNwPwFZrsfIZAwHQTGaTPq6E-0mt4nLnLNYXmHkIizT9kDXeRfN5HApwYwGlTpawp/exec";

/** 呼び出すGASのURL */
export const GAS_URL = DEPT ? GAS_URL_SHARED : GAS_URL_LEGACY;

/** GASの処理名（action） */
export const ACTION = {
  GET_ASSIGNED_STORE: "get_assigned_store",
  GET_CATEGORY: "get_category",
  RECORD_ACHIEVE: "record_achieve",
  RECORD_PROFILE: "record_profile",
  GET_PROFILE: "get_profile",
  IS_MAINTENANCE: "is_maintenance",
};

/** 定数シートの区分ID */
export const KUBUN = {
  WORK_CATEGORY: "1", // 稼働内容
  WORK_ITEM: "2",     // 獲得項目
};
