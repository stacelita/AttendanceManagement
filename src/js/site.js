const LIFF_ID = '2008956543-HV2ZIzKe';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyKD_Su-tKQNM9U07-2S3I1yvBn-9bAKFABzwSTeckViKFomaP_Zm0K0L_EsYf_bSDSvg/exec';

// LIFF初期化（どのページでも最初に呼ぶ）
async function initLiff() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
            liff.login();
            return false;
        }
        return true;
    } catch (error) {
        console.error('LIFF初期化失敗', error);
        return false;
    }
}

// 勤怠ページ専用の初期化処理
async function setupAttendancePage() {
    const isInit = await initLiff();
    if (!isInit) return;

    // 日付セットと検索
    const datePicker = document.getElementById('datePicker');
    const today = new Date().toLocaleDateString('sv-SE');
    datePicker.value = today;
    await fetchShift(today);
	await setupKubunDropdown('workCategory', '1');
	
    datePicker.addEventListener('change', (e) => fetchShift(e.target.value));

    // フォーム送信
    document.getElementById('workForm').addEventListener('submit', handleAttendanceSubmit);
}

// GASからシフトを取得する関数（単独でも呼べるように外に出しておく）
async function fetchShift(selectedDate) {
    const display = document.getElementById('locationDisplay');
    display.innerText = "読み込み中...";
    try {
        const profile = await liff.getProfile();
        const response = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "shift_search", userId: profile.userId, targetDate: selectedDate })
        });
        const data = await response.json();
        display.innerText = data.location;
    } catch (e) { display.innerText = "エラー"; }
}

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
        const profile = await liff.getProfile();
        
        // --- プルダウンの「テキスト（区分名）」を取得する ---
        const categorySelect = document.getElementById('workCategory');
        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        const categoryValue = categorySelect.value;
        
        const formData = {
            action: "achieve",
            userId: profile.userId,
            userName: profile.displayName,
            date: document.getElementById('datePicker').value,
            categoryName: categoryValue,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            memo: document.getElementById('memo').value
        };

        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
        });

        if (liff.isInClient()) {
            await liff.sendMessages([{
                type: 'text',
                text: `【勤務実績登録】\n` +
                      `日付：${formData.date}\n` +
                      `区分：${formData.categoryName}\n` +
                      `時間：${formData.startTime}～${formData.endTime}\n` +
                      `備考：${formData.memo || 'なし'}`
            }]);
        }
        alert('送信完了！');
        liff.closeWindow();
    } catch (error) {
        alert('エラーが発生しました。');
        if (overlay) overlay.style.display = 'none';
    }
}

/**
 * GETリクエストで区分データを取得してプルダウンを生成する
 */
async function setupKubunDropdown(selectId, kubunType) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    try {
        // URLパラメータを構築
        const url = `${GAS_URL}?action=get_kubun&kubunType=${kubunType}`;
        
        const response = await fetch(url);
        const dataList = await response.json();

        selectEl.innerHTML = '<option value="">選択してください</option>';

        dataList.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.name;
            selectEl.appendChild(option);
        });
    } catch (error) {
        console.error("区分データ取得エラー:", error);
    }
}
