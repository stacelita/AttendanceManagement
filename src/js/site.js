const LIFF_ID_ARCHIVE = "2008956543-HV2ZIzKe";
const LIFF_ID_PROFILE = "2008956543-MaLNj6aF";
const GAS_URL = "https://script.google.com/macros/s/AKfycbyKD_Su-tKQNM9U07-2S3I1yvBn-9bAKFABzwSTeckViKFomaP_Zm0K0L_EsYf_bSDSvg/exec";

const ACTION = {
  GET_ASSIGNED_STORE: "get_assigned_store",
  GET_CATEGORY: "get_category",
  RECORD_ARCHIVE: "record_achieve",
  RECORD_PROFILE: "record_profile",
  GET_PROFILE: "get_profile",
  IS_MAINTENANCE: "is_maintenance",
};

/** 
 * idによるHTML要素取得
*/
function getEl(id) {
  return document.getElementById(id);
}

/** 
 * オーバレイ設定
*/
function setOverlay(visible, text) {
  const overlay = getEl("overlay");
  const overlayText = getEl("overlayText");
  if (!overlay || !overlayText) return;
  if (text) overlayText.textContent = text;
  overlay.style.display = visible ? "flex" : "none";
}

/** 
 * ページ読み込み失敗
*/
function showPageInitError(message) {
  const overlayText = getEl("overlayText");
  if (overlayText) overlayText.textContent = message;
}

/** 
 * JSONパース 
*/
function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** 
 * apipostリクエスト 
*/
async function apiPost(payload) {
  // mode: 'no-cors' を削除。
  // Content-Typeを指定しないことで、GASが苦手な「プリフライトリクエスト」を回避します。
  const response = await fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify(payload), 
  });

  if (!response.ok) {
    throw new Error(`HTTPエラー: ${response.status}`);
  }

  // GASの ContentService.createTextOutput().setMimeType(JSON) の結果を受け取る
  const result = await response.json();

  // GAS側で status: "error" を返している場合の判定
  if (result && result.status === "error") {
    throw new Error(result.message || "GAS側でエラーが発生しました。");
  }

  return result;
}

/** 
 * apigetリクエスト 
*/
async function apiGet(action, params) {
  const search = new URLSearchParams();
  search.set("action", action);
  if (params) {
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined) return;
      search.set(key, String(params[key]));
    });
  }

  const url = `${GAS_URL}?${search.toString()}`;
  const response = await fetch(url, { method: "GET" });
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (!response.ok) {
    throw new Error("API GETリクエストに失敗しました。");
  }
  if (data && data.status === "error") {
    const detail = data.message || "サーバーエラー";
    throw new Error(detail);
  }
  return data;
}

/** 
 * 項目スクロール
*/
function scrollToAndFocus(el) {
  if (!el) return;

  // まずスクロール可能な親を探す（LIFF/iframe内で window スクロールが効かないケース対策）
  const scrollableParent = (() => {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = window.getComputedStyle(node);
      const overflowY = style.overflowY;
      const isScrollable =
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight;
      if (isScrollable) return node;
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement;
  })();

  // 可能なら親の scrollTop を直接調整
  try {
    if (scrollableParent) {
      // scrollableParent が body/html 以外でも scrollTop が使えるなら使う
      if (scrollableParent !== document.documentElement) {
        const elRect = el.getBoundingClientRect();
        const parentRect = scrollableParent.getBoundingClientRect();
        const currentTop = elRect.top - parentRect.top;
        scrollableParent.scrollTop += currentTop - 20;
      } else {
        const rect = el.getBoundingClientRect();
        const y = Math.max(0, (window.pageYOffset || 0) + rect.top - 20);
        window.scrollTo({ top: y, behavior: "auto" });
      }
    }
  } catch {
    // 無視
  }

  // scrollIntoView（最終手段）
  try {
    el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  } catch {
    // 無視
  }

}

/** 
 * liff初期化処理
*/
async function initLiff(inLiffId) {
  try {
    await liff.init({ liffId: inLiffId });
    if (!liff.isLoggedIn()) {
      liff.login();
      return false;
    }
    return true;
  } catch (error) {
    console.error("LIFF初期化失敗", error);
    return false;
  }
}

/**
 * 区分値取得
*/
async function setupKubunDropdown(selectId, kubunType, addDefault = true) {
  const selectEl = getEl(selectId);
  if (!selectEl) return;

  try {
    const dataList = await apiGet(ACTION.GET_CATEGORY, { kubunType: kubunType });
    selectEl.innerHTML = "";

    if (addDefault) {
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "選択してください";
      selectEl.appendChild(defaultOption);
    }

    dataList.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.name;
      selectEl.appendChild(option);
    });
  } catch (error) {
    console.error("区分データ取得エラー:", error);
    throw error;
  }
}

/** 
 * プルダウン取得
 */
function getSelectedItems() {
  const selects = document.querySelectorAll(".item-count-select");
  return Array.from(selects).map((select) => ({
    id: select.dataset.itemId,
    name: select.dataset.itemName,
    count: Number(select.value),
  }));
}

/** 
 * メンテナンス中取得 
*/
async function isMaintenance() {
  try {
    const data = await apiGet(ACTION.IS_MAINTENANCE, { });
    return !!(data && data.is_maintenance);
  } catch (error) {
    throw error;
  }
}

/** 
 * モーダル表示 
*/
const showModal = (message) => {
  return new Promise((resolve) => {
    const modalElem = document.getElementById('statusModal');
    // Bootstrapのモーダルインスタンスを作成
    const modal = new bootstrap.Modal(modalElem);
    
    document.getElementById('modalMessage').innerText = message;
    
    const confirmBtn = document.getElementById('modalConfirmBtn');
    confirmBtn.onclick = () => {
      modal.hide();
      // 完全に閉じてから resolve する（念のため）
      modalElem.addEventListener('hidden.bs.modal', () => {
        resolve();
      }, { once: true });
    };

    modal.show();
  });
};

/**
 * プルダウン設定(年)
 */
function setupYearSelect(elementId, startYear = 1940, endYear = new Date().getFullYear()) {
    const select = document.getElementById(elementId);
    if (!select) return;

    for (let i = endYear; i >= startYear; i--) {
        select.add(new Option(i + '年', i));
    }
}

/**
 * プルダウン設定(月)
 */
function setupMonthSelect(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    for (let i = 1; i <= 12; i++) {
        const val = ("0" + i).slice(-2);
        select.add(new Option(i + '月', val));
    }
}

/**
 * プルダウン設定(日)
 */
function setupDaySelect(elementId) {
    const select = document.getElementById(elementId);
    if (!select) return;

    for (let i = 1; i <= 31; i++) {
        const val = ("0" + i).slice(-2);
        select.add(new Option(i + '日', val));
    }
}

/**
 * メンテナンス画面表示
 */
function showMaintenancePage() {

  // bodyの中身をメンテナンス表示に差し替える
  document.body.classList.add("maintenance-body");

  document.body.innerHTML = `
    <div class="container d-flex align-items-center justify-content-center maintenance-wrapper">
      <div class="text-center maintenance-card">
        
        <div class="mb-4">
          <i class="bi bi-gear-fill working-animation"></i>
        </div>

        <h2 class="maintenance-title">メンテナンス中</h2>
        
        <p class="maintenance-text">
          いつもお疲れ様です！<br>
          現在、サービスの向上のため<br>
          メンテナンスを行っております。
        </p>

        <button onclick="liff.closeWindow()" class="btn btn-maintenance-close">
          LINEに戻る
        </button>

      </div>
    </div>
  `;
  setOverlay(false);
}

document.addEventListener('keydown', function (e) {
  // 押されたキーがEnter（13）でない場合は無視
  if (e.key !== 'Enter') return;

  const target = e.target;

  // 1. textarea内でのEnterは「改行」なので許可
  if (target.tagName === 'TEXTAREA') return;

  // 2. type="submit" や type="button" の上でのEnterは「クリック」と同じなので許可
  if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && ['submit', 'button'].includes(target.type))) {
    return;
  }

  // それ以外の INPUT 要素（text, number, dateなど）でのEnterは送信を防止
  e.preventDefault();
  
  // (オプション) Enterを押したときに次の入力欄にフォーカスを移したい場合は、ここに処理を追加できます
  console.log("Enterによる送信をブロックしました");
});