/**
 * 게임 런처 애플리케이션
 * 자동 업데이트 확인 및 다운로드 기능
 */

class GameLauncher {
  constructor() {
    // package.json에서 버전 정보 가져오기 (실제로는 번들링 시 주입되거나 별도 설정 파일 사용)
    this.currentVersion = '1.0.0';

    // UpdateChecker 인스턴스 생성
    this.updateChecker = new UpdateChecker({
      owner: 'k30339035', // GitHub 사용자명 (실제 사용자명으로 변경 필요)
      repo: 'mytest', // 저장소 이름 (실제 저장소명으로 변경 필요)
      currentVersion: this.currentVersion
    });

    this.autoCheckInterval = null;
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    this.setupUI();
    this.bindEvents();
    this.checkForUpdates();

    // 자동 업데이트 확인이 활성화되어 있으면 시작
    const autoCheckEnabled = localStorage.getItem('autoCheckEnabled') !== 'false';
    if (autoCheckEnabled) {
      this.startAutoCheck();
    }
  }

  /**
   * UI 설정
   */
  setupUI() {
    document.getElementById('currentVersion').textContent = this.currentVersion;

    // 로컬 스토리지에서 자동 확인 설정 불러오기
    const autoCheckEnabled = localStorage.getItem('autoCheckEnabled') !== 'false';
    document.getElementById('autoCheckToggle').checked = autoCheckEnabled;
  }

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 다운로드 버튼
    document.getElementById('downloadBtn').addEventListener('click', () => {
      this.downloadUpdate();
    });

    // 나중에 버튼
    document.getElementById('laterBtn').addEventListener('click', () => {
      this.hideUpdateInfo();
    });

    // 게임 시작 버튼
    document.getElementById('launchGameBtn').addEventListener('click', () => {
      this.launchGame();
    });

    // 수동 업데이트 확인 버튼
    document.getElementById('manualCheckBtn').addEventListener('click', () => {
      this.checkForUpdates();
    });

    // 자동 업데이트 확인 토글
    document.getElementById('autoCheckToggle').addEventListener('change', (e) => {
      const enabled = e.target.checked;
      localStorage.setItem('autoCheckEnabled', enabled);

      if (enabled) {
        this.startAutoCheck();
      } else {
        this.stopAutoCheck();
      }
    });
  }

  /**
   * 업데이트 확인
   */
  async checkForUpdates() {
    this.showStatus('업데이트 확인 중...');

    try {
      const result = await this.updateChecker.checkForUpdates();

      if (result.error) {
        this.showError(result.error);
        return;
      }

      if (result.needsUpdate) {
        this.showUpdateAvailable(result);
      } else {
        this.showNoUpdate();
      }
    } catch (error) {
      this.showError(error.message);
    }
  }

  /**
   * 상태 표시
   */
  showStatus(message) {
    this.hideAllInfo();
    const statusContainer = document.getElementById('updateStatus');
    statusContainer.querySelector('.status-text').textContent = message;
    statusContainer.classList.remove('hidden');
  }

  /**
   * 업데이트 가능 정보 표시
   */
  showUpdateAvailable(updateInfo) {
    this.hideAllInfo();

    const updateInfoElement = document.getElementById('updateInfo');
    document.getElementById('currentVer').textContent = updateInfo.currentVersion;
    document.getElementById('latestVer').textContent = updateInfo.latestVersion;

    // 릴리스 노트 표시 (마크다운을 HTML로 간단히 변환)
    const releaseNotes = this.formatReleaseNotes(updateInfo.releaseNotes || '업데이트 내역이 없습니다.');
    document.getElementById('releaseNotes').innerHTML = releaseNotes;

    // 다운로드 URL 저장
    updateInfoElement.dataset.downloadUrl = updateInfo.downloadUrl;
    updateInfoElement.dataset.htmlUrl = updateInfo.htmlUrl;

    updateInfoElement.classList.remove('hidden');
  }

  /**
   * 업데이트 없음 표시
   */
  showNoUpdate() {
    this.hideAllInfo();
    document.getElementById('noUpdateInfo').classList.remove('hidden');

    // 3초 후 자동으로 숨기기
    setTimeout(() => {
      this.hideAllInfo();
    }, 3000);
  }

  /**
   * 에러 표시
   */
  showError(message) {
    this.hideAllInfo();
    const errorInfo = document.getElementById('errorInfo');
    document.getElementById('errorMessage').textContent = message;
    errorInfo.classList.remove('hidden');

    // 5초 후 자동으로 숨기기
    setTimeout(() => {
      this.hideAllInfo();
    }, 5000);
  }

  /**
   * 모든 정보 숨기기
   */
  hideAllInfo() {
    document.getElementById('updateStatus').classList.add('hidden');
    document.getElementById('updateInfo').classList.add('hidden');
    document.getElementById('noUpdateInfo').classList.add('hidden');
    document.getElementById('errorInfo').classList.add('hidden');
  }

  /**
   * 업데이트 정보 숨기기
   */
  hideUpdateInfo() {
    document.getElementById('updateInfo').classList.add('hidden');
  }

  /**
   * 릴리스 노트 포맷팅
   */
  formatReleaseNotes(notes) {
    // 간단한 마크다운 변환 (실제로는 markdown 라이브러리 사용 권장)
    return notes
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/^# (.*$)/gim, '<h2>$1</h2>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  }

  /**
   * 업데이트 다운로드
   */
  downloadUpdate() {
    const updateInfoElement = document.getElementById('updateInfo');
    const downloadUrl = updateInfoElement.dataset.downloadUrl;
    const htmlUrl = updateInfoElement.dataset.htmlUrl;

    if (downloadUrl) {
      // 브라우저에서 다운로드 링크 열기
      window.open(downloadUrl, '_blank');

      // 사용자에게 안내 메시지 표시
      alert('다운로드가 시작되었습니다.\n다운로드 완료 후 설치를 진행해주세요.\n\n설치 후 애플리케이션을 다시 시작하면 업데이트가 적용됩니다.');

      // 혹은 GitHub 릴리스 페이지로 이동
      // window.open(htmlUrl, '_blank');
    } else {
      this.showError('다운로드 URL을 찾을 수 없습니다.');
    }
  }

  /**
   * 게임 시작
   */
  launchGame() {
    // 실제 게임 실행 로직 (예: 다른 페이지로 이동 또는 Electron 앱 실행)
    console.log('게임을 시작합니다...');

    // 웹 기반인 경우
    // window.location.href = 'game.html';

    // Electron 앱인 경우
    // ipcRenderer.send('launch-game');

    alert('게임을 시작합니다!\n(실제 게임 페이지로 이동하는 로직을 구현해주세요)');
  }

  /**
   * 자동 업데이트 확인 시작
   */
  startAutoCheck() {
    // 이미 실행 중이면 중지
    this.stopAutoCheck();

    // 1시간마다 자동 확인 (3600000ms)
    this.autoCheckInterval = this.updateChecker.startAutoCheck(3600000, (updateInfo) => {
      // 업데이트 발견 시 알림
      this.showUpdateNotification(updateInfo);
    });

    console.log('자동 업데이트 확인이 시작되었습니다 (1시간마다)');
  }

  /**
   * 자동 업데이트 확인 중지
   */
  stopAutoCheck() {
    if (this.autoCheckInterval) {
      this.updateChecker.stopAutoCheck(this.autoCheckInterval);
      this.autoCheckInterval = null;
      console.log('자동 업데이트 확인이 중지되었습니다');
    }
  }

  /**
   * 업데이트 알림 표시
   */
  showUpdateNotification(updateInfo) {
    // 브라우저 알림 권한 확인
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎮 게임 업데이트 알림', {
        body: `새로운 버전 ${updateInfo.latestVersion}이(가) 출시되었습니다!`,
        icon: 'icon.png' // 아이콘 경로 (필요시 추가)
      });
    }

    // UI에도 표시
    this.showUpdateAvailable(updateInfo);
  }

  /**
   * 알림 권한 요청
   */
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

// 페이지 로드 시 런처 시작
document.addEventListener('DOMContentLoaded', () => {
  const launcher = new GameLauncher();

  // 알림 권한 요청
  launcher.requestNotificationPermission();
});
