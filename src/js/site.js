const LIFF_ID_ARCHIVE = "2008956543-HV2ZIzKe";
const LIFF_ID_PROFILE = "2008956543-MaLNj6aF";
const GAS_URL = "https://script.google.com/macros/s/AKfycbyKD_Su-tKQNM9U07-2S3I1yvBn-9bAKFABzwSTeckViKFomaP_Zm0K0L_EsYf_bSDSvg/exec";

const ACTION = {
  SHIFT_SEARCH: "shift_search",
  GET_KUBUN: "get_kubun",
  ACHIEVE: "achieve",
  PROFILE: "profile",
};

function getEl(id) {
  return document.getElementById(id);
}

function setOverlay(visible, text) {
  const overlay = getEl("overlay");
  const overlayText = getEl("overlayText");
  if (!overlay || !overlayText) return;
  if (text) overlayText.textContent = text;
  overlay.style.display = visible ? "flex" : "none";
}

function showPageInitError(message) {
  const overlayText = getEl("overlayText");
  if (overlayText) overlayText.textContent = message;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function apiPost(payload) {
  const response = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = parseJsonSafe(text);
  if (!response.ok) {
    throw new Error("APIリクエストに失敗しました。");
  }
  if (data && data.status === "error") {
    const detail = data.message || "サーバーエラー";
    throw new Error(detail);
  }
  return data;
}

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

async function apiPostOrFallbackGet(payload) {
  try {
    return await apiPost(payload);
  } catch (postError) {
    console.warn("POST失敗のためGETへフォールバック:", postError);
    const { action, items, ...rest } = payload || {};
    const queryParams = { ...rest };
    if (items !== undefined) queryParams.items = JSON.stringify(items);
    return await apiGet(action, queryParams);
  }
}

async function apiGetKubun(kubunType) {
  const url = `${GAS_URL}?action=${ACTION.GET_KUBUN}&kubunType=${encodeURIComponent(kubunType)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("区分データの取得に失敗しました。");
  }
  return response.json();
}

function getMissingRequiredValues(formData, requiredKeys) {
  return requiredKeys.filter((key) => {
    const value = formData[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
}

function validateAttendanceForm(formData) {
  const required = ["date", "categoryValue"];
  const missing = getMissingRequiredValues(formData, required);
  if (missing.length > 0) {
    throw new Error("必須項目を入力してください。");
  }
}

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

  // focus（できるなら。できない場合でもスクロール自体は効いてほしい）
  try {
    el.focus();
  } catch {
    // 無視
  }
}

function validateAttendanceRequiredUI() {
  const dateEl = getEl("datePicker");
  const categoryEl = getEl("workCategory");

  if (dateEl && !dateEl.checkValidity()) {
    // ブラウザのrequiredメッセージが出るように reportValidity を呼ぶ
    scrollToAndFocus(dateEl);
    // スクロール反映のタイミングズレ対策
    setTimeout(() => dateEl.reportValidity(), 100);
    return false;
  }

  // workCategory は select なので value で判定（デフォルトは "" の想定）
  if (categoryEl && !categoryEl.checkValidity()) {
    scrollToAndFocus(categoryEl);
    setTimeout(() => categoryEl.reportValidity(), 100);
    return false;
  }

  return true;
}

function validateProfileForm(formData) {
  const required = ["userName", "userKana", "birthDate", "station", "tel"];
  const missing = getMissingRequiredValues(formData, required);
  if (missing.length > 0) {
    throw new Error("必須項目を入力してください。");
  }
}

function validateProfileRequiredUI() {
  const userNameEl = getEl("userName");
  if (userNameEl && !userNameEl.checkValidity()) {
    scrollToAndFocus(userNameEl);
    setTimeout(() => userNameEl.reportValidity(), 100);
    return false;
  }

  const userKanaEl = getEl("userKana");
  if (userKanaEl && !userKanaEl.checkValidity()) {
    scrollToAndFocus(userKanaEl);
    setTimeout(() => userKanaEl.reportValidity(), 100);
    return false;
  }

  const birthDateEl = getEl("birthDate");
  if (birthDateEl && !birthDateEl.checkValidity()) {
    scrollToAndFocus(birthDateEl);
    setTimeout(() => birthDateEl.reportValidity(), 100);
    return false;
  }

  const stationEl = getEl("station");
  if (stationEl && !stationEl.checkValidity()) {
    scrollToAndFocus(stationEl);
    setTimeout(() => stationEl.reportValidity(), 100);
    return false;
  }

  const telEl = getEl("tel");
  if (telEl && !telEl.checkValidity()) {
    scrollToAndFocus(telEl);
    setTimeout(() => telEl.reportValidity(), 100);
    return false;
  }

  return true;
}

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

async function setupAttendancePage() {
  const datePicker = getEl("datePicker");
  const workForm = getEl("workForm");
  if (!datePicker || !workForm) return;

  try {
    const isInit = await initLiff(LIFF_ID_ARCHIVE);
    if (!isInit) return;

    const today = new Date().toLocaleDateString("sv-SE");
    datePicker.value = today;

    await Promise.all([
      fetchShift(today),
      setupKubunDropdown("workCategory", "1"),
      setupWorkItemList("2"),
    ]);

    setOverlay(false);
  } catch (error) {
    console.error("初期化エラー:", error);
    showPageInitError("読み込みに失敗しました。再読み込みしてください。");
  }

  datePicker.addEventListener("change", (e) => fetchShift(e.target.value));
  workForm.addEventListener("submit", handleAttendanceSubmit);
}

async function fetchShift(selectedDate) {
  const display = getEl("locationDisplay");
  if (!display) return;
  display.innerText = "読み込み中...";

  try {
    const profile = await liff.getProfile();
    // shift_search は読み取りなので GET に寄せてCORS影響を減らす
    const data = await apiGet(ACTION.SHIFT_SEARCH, {
      userId: profile.userId,
      targetDate: selectedDate,
    });
    display.innerText = data && data.location ? data.location : "シフトなし";
  } catch (error) {
    console.error("シフト取得エラー:", error);
    display.innerText = "エラー";
  }
}

async function handleAttendanceSubmit(e) {
  e.preventDefault();

  const form = getEl("workForm");
  // ブラウザ標準UIだけだとアラートが出ないため、こちらで必須チェックと通知を行う
  if (!validateAttendanceRequiredUI()) return;

  setOverlay(true, "送信中...");

  try {
    const profile = await liff.getProfile();
    const categorySelect = getEl("workCategory");
    const selectedItems = getSelectedItems();
    const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || "";

    const formData = {
      action: ACTION.ACHIEVE,
      userId: profile.userId,
      userName: profile.displayName,
      date: getEl("datePicker").value,
      categoryValue: categorySelect.value,
      items: selectedItems,
      uniqueProducts: getEl("uniqueProducts").value.trim(),
      memo: getEl("memo").value.trim(),
    };

    validateAttendanceForm(formData);
    await apiPostOrFallbackGet(formData);

    const itemsText = selectedItems.length > 0
      ? selectedItems.map((item) => `${item.name}: ${item.count}`).join("\n")
      : "なし";

    if (liff.isInClient()) {
      await liff.sendMessages([{
        type: "text",
        text: `【勤務実績登録】\n` +
          `日付：${formData.date}\n` +
          `稼働内容：${categoryName}\n` +
          `--- 獲得項目 ---\n` +
          `${itemsText}\n` +
          `----------------\n` +
          `独自商材：${formData.uniqueProducts || "なし"}\n` +
          `備考：${formData.memo || "なし"}`,
      }]);
    }

    alert("送信完了！");
    liff.closeWindow();
  } catch (error) {
    alert(error.message || "エラーが発生しました。");
  } finally {
    setOverlay(false);
  }
}

async function setupKubunDropdown(selectId, kubunType, addDefault = true) {
  const selectEl = getEl(selectId);
  if (!selectEl) return;

  try {
    const dataList = await apiGetKubun(kubunType);
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

async function setupWorkItemList(kubunType) {
  const container = getEl("workItemList");
  if (!container) return;

  try {
    const dataList = await apiGetKubun(kubunType);
    container.innerHTML = "";

    dataList.forEach((item) => {
      const div = document.createElement("div");
      div.className = "list-group-item d-flex justify-content-between align-items-center py-3";

      const nameSpan = document.createElement("span");
      nameSpan.className = "fw-bold text-secondary";
      nameSpan.textContent = item.name;

      const select = document.createElement("select");
      select.className = "form-select form-select-sm w-auto item-count-select";
      select.dataset.itemId = item.value;
      select.dataset.itemName = item.name;

      for (let i = 0; i <= 10; i++) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = i;
        select.appendChild(opt);
      }

      div.appendChild(nameSpan);
      div.appendChild(select);
      container.appendChild(div);
    });
  } catch (error) {
    console.error("獲得項目リスト取得エラー:", error);
    container.innerHTML = '<div class="list-group-item text-danger">データの取得に失敗しました</div>';
    throw error;
  }
}

function getSelectedItems() {
  const selects = document.querySelectorAll(".item-count-select");
  return Array.from(selects).map((select) => ({
    id: select.dataset.itemId,
    name: select.dataset.itemName,
    count: Number(select.value),
  }));
}

async function setupProfilePage() {
  const staffForm = getEl("staffForm");
  if (!staffForm) return;

  try {
    const isInit = await initLiff(LIFF_ID_PROFILE);
    if (!isInit) return;
    setOverlay(false);
  } catch (error) {
    console.error("初期化エラー:", error);
    showPageInitError("読み込みに失敗しました。再読み込みしてください。");
  }

  staffForm.addEventListener("submit", handleProfileSubmit);
}

async function handleProfileSubmit(e) {
  e.preventDefault();

  const form = getEl("staffForm");
  if (form && !validateProfileRequiredUI()) return;

  setOverlay(true, "送信中...");

  try {
    const profile = await liff.getProfile();
    const formData = {
      action: ACTION.PROFILE,
      userId: profile.userId,
      displayName: profile.displayName,
      userName: getEl("userName").value.trim(),
      userKana: getEl("userKana").value.trim(),
      birthDate: getEl("birthDate").value,
      station: getEl("station").value.trim(),
      tel: getEl("tel").value.trim(),
    };

    validateProfileForm(formData);
    await apiPostOrFallbackGet(formData);

    if (liff.isInClient()) {
      await liff.sendMessages([{
        type: "text",
        text: `【スタッフ情報登録】\n` +
          `氏名：${formData.userName}\n` +
          `フリガナ：${formData.userKana}\n` +
          `生年月日：${formData.birthDate}\n` +
          `最寄り駅：${formData.station}\n` +
          `電話番号：${formData.tel}`,
      }]);
    }

    await showModal("送信完了！");
    liff.closeWindow();
  } catch (error) {
    await showModal(error.message || "エラーが発生しました。");
  } finally {
    setOverlay(false);
  }
}

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