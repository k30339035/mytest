/**
 * 자동 업데이트 체커 모듈
 * GitHub Releases API를 사용하여 최신 버전을 확인합니다
 */

class UpdateChecker {
  constructor(options = {}) {
    this.owner = options.owner || 'k30339035'; // GitHub 사용자명
    this.repo = options.repo || 'mytest'; // 저장소 이름
    this.currentVersion = options.currentVersion || '1.0.0';
    this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
  }

  /**
   * 최신 릴리스 정보를 가져옵니다
   */
  async fetchLatestRelease() {
    try {
      const response = await fetch(this.apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API 오류: ${response.status}`);
      }

      const data = await response.json();
      return {
        version: data.tag_name.replace('v', ''), // v1.0.0 -> 1.0.0
        downloadUrl: data.assets[0]?.browser_download_url || data.zipball_url,
        releaseNotes: data.body,
        publishedAt: data.published_at,
        htmlUrl: data.html_url
      };
    } catch (error) {
      console.error('업데이트 확인 중 오류:', error);
      throw error;
    }
  }

  /**
   * 버전 비교 (semantic versioning)
   * @returns {number} -1: 현재 버전이 최신, 0: 같음, 1: 업데이트 필요
   */
  compareVersions(currentVersion, latestVersion) {
    const current = currentVersion.split('.').map(Number);
    const latest = latestVersion.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (latest[i] > current[i]) return 1;
      if (latest[i] < current[i]) return -1;
    }
    return 0;
  }

  /**
   * 업데이트 확인
   * @returns {Object} { needsUpdate: boolean, latestVersion: string, downloadUrl: string }
   */
  async checkForUpdates() {
    try {
      const latestRelease = await this.fetchLatestRelease();
      const needsUpdate = this.compareVersions(this.currentVersion, latestRelease.version) === 1;

      return {
        needsUpdate,
        currentVersion: this.currentVersion,
        latestVersion: latestRelease.version,
        downloadUrl: latestRelease.downloadUrl,
        releaseNotes: latestRelease.releaseNotes,
        publishedAt: latestRelease.publishedAt,
        htmlUrl: latestRelease.htmlUrl
      };
    } catch (error) {
      return {
        needsUpdate: false,
        error: error.message
      };
    }
  }

  /**
   * 자동 업데이트 확인 (주기적)
   * @param {number} interval - 확인 주기 (밀리초)
   * @param {function} callback - 업데이트 발견 시 실행할 콜백
   */
  startAutoCheck(interval = 3600000, callback) { // 기본 1시간
    const check = async () => {
      const result = await this.checkForUpdates();
      if (result.needsUpdate && callback) {
        callback(result);
      }
    };

    // 즉시 한 번 실행
    check();

    // 주기적으로 실행
    return setInterval(check, interval);
  }

  /**
   * 자동 업데이트 확인 중지
   */
  stopAutoCheck(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

// 브라우저와 Node.js 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UpdateChecker;
} else if (typeof window !== 'undefined') {
  window.UpdateChecker = UpdateChecker;
}
