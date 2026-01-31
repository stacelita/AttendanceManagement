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
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');

    try {
        const isInit = await initLiff();
        if (!isInit) return;

        // 日付セット
        const datePicker = document.getElementById('datePicker');
        const today = new Date().toLocaleDateString('sv-SE');
        datePicker.value = today;

        // 【重要】全ての非同期処理（シフト・プルダウン2つ）を並列で実行し、完了を待つ
        await Promise.all([
            fetchShift(today),
            setupKubunDropdown('workCategory', '1'),
            //setupKubunDropdown('workItem', '2', false)
            setupWorkItemList(2)
        ]);

        // 全て終わったらオーバーレイを隠す
        overlay.style.setProperty('display', 'none', 'important');

    } catch (error) {
        console.error("初期化エラー:", error);
        overlayText.textContent = "読み込みに失敗しました。再読み込みしてください。";
        // エラー時はあえて消さない、またはアラートを出すなどの処理
    }

    // イベントリスナー登録
    datePicker.addEventListener('change', (e) => fetchShift(e.target.value));
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
    document.getElementById('overlayText').textContent = "送信中...";
    overlay.style.display = 'flex';

    try {
        const profile = await liff.getProfile();
        
        // --- プルダウンの「テキスト（区分名）」を取得する ---
        const categorySelect = document.getElementById('workCategory');
        const categoryName = categorySelect.options[categorySelect.selectedIndex].text;
        const categoryValue = categorySelect.value;
        
        // --- 獲得項目（リスト形式・複数選択）の取得 ---
        const selectedItems = getSelectedItems(); // さきほど作成した関数
        
        // 獲得項目を「項目A: 2, 項目B: 1」のような表示用テキストにする
        const itemsText = selectedItems.length > 0 
            ? selectedItems.map(item => `${item.name}: ${item.count}`).join('\n') 
            : 'なし';
        
        const formData = {
            action: "achieve",
            userId: profile.userId,
            userName: profile.displayName,
            date: document.getElementById('datePicker').value,
            categoryValue: categoryValue,
            items: selectedItems,
            uniqueProducts: document.getElementById('uniqueProducts').value,
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
                      `稼働内容：${categoryName}\n` +
                      `--- 獲得項目 ---\n` +
                      `${itemsText}\n` +
                      `----------------\n` +
                      `独自商材：${formData.uniqueProducts}\n` +
                      `備考：${formData.memo || 'なし'}`
            }]);
        }
        alert('送信完了！');
        liff.closeWindow();
    } catch (error) {
        alert('エラーが発生しました。');
        overlay.style.display = 'none';
    } finally {
        // 成功しても失敗しても最後は隠す
        overlay.style.display = 'none';
    }
}

/**
 * GETリクエストで区分データを取得してプルダウンを生成する
 * @param {*} selectId 
 * @param {*} kubunType 
 * @param {*} addDefault 
 * @returns 
 */
async function setupKubunDropdown(selectId, kubunType, addDefault = true) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    try {
        // URLパラメータを構築
        const url = `${GAS_URL}?action=get_kubun&kubunType=${kubunType}`;  
        const response = await fetch(url);
        const dataList = await response.json();

        // addDefaultがtrueの場合のみデフォルト項目を追加
        if (addDefault) {
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "選択してください";
            selectEl.appendChild(defaultOption);
        }

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

/**
 * 獲得項目をリスト形式で生成（個数選択付き）
 */
async function setupWorkItemList(kubunType) {
    const container = document.getElementById('workItemList');
    if (!container) return;

    try {
        const url = `${GAS_URL}?action=get_kubun&kubunType=${kubunType}`;
        const response = await fetch(url);
        const dataList = await response.json();

        container.innerHTML = ''; // クリア

        dataList.forEach(item => {
            // 1行分のラッパー
            const div = document.createElement('div');
            div.className = "list-group-item d-flex justify-content-between align-items-center py-3";
            
            // 項目名
            const nameSpan = document.createElement('span');
            nameSpan.className = "fw-bold text-secondary";
            nameSpan.textContent = item.name;
            
            // 数字プルダウン (0〜10まで選択可能にする例)
            const select = document.createElement('select');
            select.className = "form-select form-select-sm w-auto item-count-select";
            select.dataset.itemId = item.value; // IDを保持
            select.dataset.itemName = item.name; // 名前も保持しておくと便利

            for (let i = 0; i <= 10; i++) {
                const opt = document.createElement('option');
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
    }
}

function getSelectedItems() {
    const selects = document.querySelectorAll('.item-count-select');
    const results = [];
    
    selects.forEach(select => {
        const count = parseInt(select.value);
        results.push({
            id: select.dataset.itemId,
            name: select.dataset.itemName,
            count: count
        });
    });
    return results; // これをGASに送るオブジェクトに含める
}

// 勤怠ページ専用の初期化処理
async function setupProfilePage() {
    const overlay = document.getElementById('overlay');
    const overlayText = document.getElementById('overlayText');

    try {
        const isInit = await initLiff();
        if (!isInit) return;

        // 全て終わったらオーバーレイを隠す
        overlay.style.setProperty('display', 'none', 'important');

    } catch (error) {
        console.error("初期化エラー:", error);
        overlayText.textContent = "読み込みに失敗しました。再読み込みしてください。";
        // エラー時はあえて消さない、またはアラートを出すなどの処理
    }
    //document.getElementById('staffForm').addEventListener('submit', handleProfilebmit);
}

/**
 * 
 * @param {*} e 
 */
async function handleProfilebmit(e) {
    e.preventDefault();
    const overlay = document.getElementById('overlay');
    document.getElementById('overlayText').textContent = "送信中...";
    overlay.style.display = 'flex';

    try {
        const profile = await liff.getProfile();
 
        const formData = {
            action: "profile",
            userId: profile.userId,
            displayName: profile.displayName,
            userName: document.getElementById('userName').value,
            userKana: document.getElementById('userKana').value,
            birthDate: document.getElementById('birthDate').value,
            station: document.getElementById('station').value,
            tel: document.getElementById('tel').value,
        };

        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(formData)
        });

        if (liff.isInClient()) {
            await liff.sendMessages([{
                type: 'text',
                text: `【スタッフ情報登録】\n` +
                      `氏名：${formData.userName}\n` +
                      `フリガナ：${formData.userKana}\n` +
                      `生年月日：${formData.birthDate}\n` +
                      `最寄り駅：${formData.station}\n` +
                      `電話番号：${formData.tel}\n`
            }]);
        }
        alert('送信完了！');
        liff.closeWindow();
    } catch (error) {
        alert('エラーが発生しました。');
        overlay.style.display = 'none';
    } finally {
        // 成功しても失敗しても最後は隠す
        overlay.style.display = 'none';
    }
}