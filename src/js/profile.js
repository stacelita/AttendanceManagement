

/**
 * スタッフ情報入力ページ初期化 
*/
async function setupProfilePage() {
  const maintenance = await isMaintenance();
  if (maintenance) {
    // メンテナンス中なら専用の表示に切り替えて、処理を中断する
    showMaintenancePage();
    return; 
  }

  const staffForm = getEl("staffForm");
  if (!staffForm) return;

  try {
    const isInit = await initLiff(LIFF_ID_PROFILE);
    if (!isInit) return;
    initializeBirthDateSelectors();

    const profile = await liff.getProfile();
    

    // データが存在する場合のみフォームにセット
 

    setOverlay(false);
  } catch (error) {
    console.error("初期化エラー:", error);
    showPageInitError("読み込みに失敗しました。再読み込みしてください。");
  }

  staffForm.addEventListener("submit", handleProfileSubmit);
}

/** 
 * 個情報報フォーム検証
*/
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

/** 
 * スタッフ情報送信
*/
async function handleProfileSubmit(e) {
  e.preventDefault();

  const form = getEl("staffForm");
  if (form && !validateProfileRequiredUI()) return;

  setOverlay(true, "送信中...");

  try {
    const profile = await liff.getProfile();
    const formData = {
      action: ACTION.RECORD_PROFILE,
      userId: profile.userId,
      displayName: profile.displayName,
      userName: getEl("userName").value.trim(),
      userKana: getEl("userKana").value.trim(),
      birthDate: getBirthDateValue(),
      station: getEl("station").value.trim(),
      tel: getEl("tel").value.trim(),
    };

    await apiPost(formData);

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
    setOverlay(false);
    await showModal("登録が完了しました！");
    liff.closeWindow();
  } catch (error) {
    setOverlay(false);
    await showModal(error.message || "エラーが発生しました。");
  }
}

/**
 * 誕生日初期化
 */
function initializeBirthDateSelectors() {
    setupYearSelect('birthYear');
    setupMonthSelect('birthMonth');
    setupDaySelect('birthDay');
}

/**
 * 誕生日取得
 */
function getBirthDateValue() {
    const y = getEl('birthYear').value;
    const m = getEl('birthMonth').value;
    const d = getEl('birthDay').value;

    if (y && m && d) {
        return `${y}-${m}-${d}`; // 例: 1990-05-20
    }
    return null;
}
