
/**
 * 勤務実績入力ページ初期化
*/
async function setupAttendancePage() {
  try {
    const maintenance = await isMaintenance();
    if (maintenance) {
      // メンテナンス中なら専用の表示に切り替えて、処理を中断する
      showMaintenancePage();
      return; 
    }
  } catch (error) {
    console.error("メンテナンス確認エラー:", error);
    // チェック自体に失敗した場合は、安全のため止めるか、続行するか判断してください
  }

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

/**
 * 勤務場所取得
*/
async function fetchShift(selectedDate) {
  const display = getEl("locationDisplay");
  if (!display) return;
  display.innerText = "読み込み中...";

  try {
    const profile = await liff.getProfile();
    // shift_search は読み取りなので GET に寄せてCORS影響を減らす
    const data = await apiGet(ACTION.GET_ASSIGNED_STORE, {
      userId: profile.userId,
      targetDate: selectedDate,
    });
    display.innerText = data && data.location ? data.location : "シフトなし";
  } catch (error) {
    console.error("シフト取得エラー:", error);
    display.innerText = "エラー";
  }
}

/** 
 * 勤務実績フォーム検証 
*/
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

/**
 * 勤務実績送信
*/
async function handleAttendanceSubmit(e) {
  e.preventDefault();

  const form = getEl("workForm");
  // ブラウザ標準UIだけだとアラートが出ないため、こちらで必須チェックと通知を行う
  if (!validateAttendanceRequiredUI()) return;

  const isOverwrite = getEl("overwriteCheck").checked;
  if (isOverwrite) {
  const isConfirmed = confirm("既に登録されている場合は情報が上書きされます。よろしいですか？");
    if (!isConfirmed) {
      // 「キャンセル」が押されたらここで処理を中断
      return; 
    }
  }

  setOverlay(true, "送信中...");

  try {
    const profile = await liff.getProfile();
    const categorySelect = getEl("workCategory");
    const selectedItems = getSelectedItems();
    const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || "";

    const formData = {
      action: ACTION.RECORD_ARCHIVE,
      userId: profile.userId,
      userName: profile.displayName,
      date: getEl("datePicker").value,
      store: getEl("locationDisplay").textContent,
      categoryValue: categorySelect.value,
      items: selectedItems,
      uniqueProducts: getEl("uniqueProducts").value.trim(),
      memo: getEl("memo").value.trim(),
      isOverwrite: isOverwrite
    };

    await apiPost(formData);

    const itemsText = selectedItems.length > 0
      ? selectedItems.map((item) => `${item.name}: ${item.count}`).join("\n")
      : "なし";

    if (liff.isInClient()) {
      await liff.sendMessages([{
        type: "text",
        text: `【勤務実績登録】\n` +
          `日付：${formData.date}\n` +
          `勤務場所：${formData.store}\n` +
          `稼働内容：${categoryName}\n` +
          `--- 獲得項目 ---\n` +
          `${itemsText}\n` +
          `----------------\n` +
          `独自商材：${formData.uniqueProducts || "なし"}\n` +
          `備考：${formData.memo || "なし"}`,
      }]);
    }
    setOverlay(false);
    await showModal("登録が完了しました！");
    liff.closeWindow();
  } catch (error) {
    setOverlay(false);
    await showModal(error.message || "エラーが発生しました。");
  }
}

/**
 * 獲得項目取得
*/
async function setupWorkItemList(kubunType) {
  const container = getEl("workItemList");
  if (!container) return;

  try {
    const dataList = await apiGet(ACTION.GET_CATEGORY, { kubunType: kubunType });
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
