/**
 * 画面の部品（オーバーレイ・モーダル・メンテナンス画面・入力チェック・プルダウン）
 */

/** id で要素を取得 */
export function getEl(id) {
  return document.getElementById(id);
}

// --- オーバーレイ（読み込み中・送信中の表示） ---

/** オーバーレイを表示（text を指定すると文言も変える） */
export function showOverlay(text) {
  const overlay = getEl("overlay");
  if (!overlay) return;
  if (text) getEl("overlayText").textContent = text;
  overlay.style.display = "flex";
}

/** オーバーレイを消す */
export function hideOverlay() {
  const overlay = getEl("overlay");
  if (overlay) overlay.style.display = "none";
}

/** 読み込みに失敗したことを、オーバーレイの文言で知らせる（操作はできないまま） */
export function showLoadError(message) {
  const overlayText = getEl("overlayText");
  if (overlayText) overlayText.textContent = message;
}

// --- モーダル ---

/**
 * メッセージをモーダルで表示し、閉じ終わるまで待つ
 * 閉じるのは OK ボタンだけ（外側のタップ・Esc では閉じない設定は HTML 側の data-bs-backdrop / data-bs-keyboard）。
 * どの方法で閉じても次の処理へ進むよう、閉じ終わったことを待つ
 * ※ bootstrap は Bootstrap のスクリプトで読み込まれるグローバル変数
 */
export function showModal(message) {
  return new Promise((resolve) => {
    const modalEl = getEl("statusModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    getEl("modalMessage").innerText = message;
    modalEl.addEventListener("hidden.bs.modal", () => resolve(), { once: true });
    getEl("modalConfirmBtn").onclick = () => modal.hide();
    modal.show();
  });
}

// --- メンテナンス画面 ---

/** 画面全体をメンテナンス中の表示に差し替える */
export function showMaintenancePage() {
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
}

// --- 入力チェック ---

/**
 * 必須項目を上から順に確認し、最初の未入力の項目までスクロールしてブラウザ標準のメッセージを出す
 * @param {HTMLElement[]} elements 確認する入力欄（画面の上から順）
 * @return {boolean} すべて入力済みなら true
 */
export function checkRequired(elements) {
  const invalid = elements.find((el) => el && !el.checkValidity());
  if (!invalid) return true;

  scrollIntoViewSafe(invalid);
  // スクロールが終わってからメッセージを出す
  setTimeout(() => invalid.reportValidity(), 100);
  return false;
}

/**
 * 要素が見える位置までスクロール
 * LIFF の画面では window のスクロールが効かないことがあるため、スクロールできる親要素を探して動かす
 */
function scrollIntoViewSafe(el) {
  try {
    const scroller = findScrollableParent(el);
    if (scroller === document.documentElement) {
      const top = Math.max(0, window.pageYOffset + el.getBoundingClientRect().top - 20);
      window.scrollTo({ top, behavior: "auto" });
    } else {
      scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 20;
    }
  } catch {
    // スクロールできなくても入力チェック自体は続ける
  }
  try {
    el.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
  } catch {
    // 同上
  }
}

function findScrollableParent(el) {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Enter キーでフォームが送信されないようにする
 * （テキスト欄では改行、ボタンの上ではクリックとして扱うので、それ以外の入力欄だけ止める）
 */
export function preventSubmitOnEnter() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const target = e.target;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
    if (target.tagName === "INPUT" && ["submit", "button"].includes(target.type)) return;
    e.preventDefault();
  });
}

// --- プルダウン ---

/**
 * プルダウンの選択肢を作り直す
 * @param {HTMLSelectElement} select
 * @param {Array<{value: string, name: string}>} items
 * @param {string|null} placeholder 先頭に入れる「選択してください」の文言（不要なら null）
 */
export function setSelectOptions(select, items, placeholder = "選択してください") {
  select.innerHTML = "";
  if (placeholder !== null) select.add(new Option(placeholder, ""));
  items.forEach((item) => select.add(new Option(item.name, item.value)));
}

/**
 * 数値の選択肢を追加する（既存の選択肢の後ろに追加）
 * @param {HTMLSelectElement} select
 * @param {number[]} numbers
 * @param {function(number): string} label 表示文言
 * @param {function(number): string} [value] 値（省略時は数値をそのまま）
 */
export function addNumberOptions(select, numbers, label, value = String) {
  numbers.forEach((n) => select.add(new Option(label(n), value(n))));
}

/** from から to までの整数（from > to なら降順） */
export function range(from, to) {
  const step = from <= to ? 1 : -1;
  const result = [];
  for (let n = from; step > 0 ? n <= to : n >= to; n += step) result.push(n);
  return result;
}

/** 2桁にゼロ埋め */
export function pad2(n) {
  return String(n).padStart(2, "0");
}
