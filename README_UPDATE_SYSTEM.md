# 🎮 게임 자동 업데이트 시스템 가이드

이 문서는 GitHub Releases를 활용한 게임 자동 업데이트 시스템의 구현 및 사용 방법을 설명합니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [준비사항](#준비사항)
3. [GitHub 저장소 설정](#github-저장소-설정)
4. [릴리스 생성 방법](#릴리스-생성-방법)
5. [클라이언트 앱 설정](#클라이언트-앱-설정)
6. [테스트 방법](#테스트-방법)
7. [문제 해결](#문제-해결)

---

## 🎯 시스템 개요

이 자동 업데이트 시스템은 다음과 같이 작동합니다:

```
[GitHub Repository]
    ↓ (새 코드 푸시)
[GitHub Releases 생성]
    ↓ (릴리스 태그 & 파일)
[GitHub Releases API]
    ↓ (API 호출)
[클라이언트 앱] → [업데이트 확인] → [다운로드 & 설치]
```

### 주요 기능

- ✅ **자동 업데이트 확인**: 1시간마다 자동으로 새 버전 확인
- ✅ **버전 비교**: Semantic Versioning (1.0.0) 방식 지원
- ✅ **릴리스 노트**: 업데이트 내역 자동 표시
- ✅ **다운로드 링크**: GitHub Releases에서 직접 다운로드
- ✅ **사용자 알림**: 브라우저 알림 지원

---

## 📦 준비사항

### 1. GitHub 계정 및 저장소

- GitHub 계정이 필요합니다
- Public 저장소 또는 Private 저장소 (Private는 인증 토큰 필요)

### 2. 파일 구조

```
mytest/
├── package.json              # 버전 정보
├── updateChecker.js          # 업데이트 체크 모듈
├── game-launcher.html        # 런처 UI
├── launcher-style.css        # 런처 스타일
├── launcher-app.js           # 런처 로직
└── README_UPDATE_SYSTEM.md   # 이 문서
```

### 3. 필요한 정보

- **GitHub 사용자명**: `k30339035` (예시)
- **저장소 이름**: `mytest` (예시)
- **현재 버전**: `package.json`에 정의

---

## 🔧 GitHub 저장소 설정

### 1단계: 저장소 확인

`launcher-app.js` 파일에서 GitHub 정보를 수정하세요:

```javascript
this.updateChecker = new UpdateChecker({
  owner: 'k30339035',  // 👈 여기를 자신의 GitHub 사용자명으로 변경
  repo: 'mytest',      // 👈 여기를 자신의 저장소 이름으로 변경
  currentVersion: this.currentVersion
});
```

### 2단계: Public 접근 권한 확인

- Public 저장소: 추가 설정 불필요
- Private 저장소: GitHub Personal Access Token 필요

#### Private 저장소용 토큰 생성 (선택사항)

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)" 클릭
3. 권한 선택: `repo` (전체 저장소 접근)
4. 토큰 생성 후 복사
5. `updateChecker.js` 수정:

```javascript
async fetchLatestRelease() {
  const response = await fetch(this.apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': 'token YOUR_GITHUB_TOKEN' // 👈 토큰 추가
    }
  });
  // ...
}
```

⚠️ **보안 주의**: 토큰을 코드에 직접 넣지 말고, 환경 변수나 설정 파일로 관리하세요!

---

## 🚀 릴리스 생성 방법

### 방법 1: GitHub 웹 인터페이스 사용 (추천)

#### 1단계: 코드 푸시

```bash
# 코드 변경 후 커밋
git add .
git commit -m "새 기능 추가"
git push origin main
```

#### 2단계: GitHub에서 Release 생성

1. GitHub 저장소 페이지 이동
2. 오른쪽 "Releases" 클릭
3. "Create a new release" 또는 "Draft a new release" 클릭
4. 릴리스 정보 입력:

**Tag version** (필수):
```
v1.0.1
```
- 반드시 `v`로 시작
- Semantic Versioning 형식: `v주버전.부버전.패치버전`

**Release title** (필수):
```
버전 1.0.1 - 새로운 기능 추가
```

**Description** (권장):
```markdown
## 새로운 기능
- ✨ 게임 내 채팅 기능 추가
- 🎨 UI 디자인 개선

## 버그 수정
- 🐛 로그인 오류 수정
- 🐛 성능 최적화

## 기타
- 📝 문서 업데이트
```

**Assets** (중요):
- 게임 파일(.zip, .exe, .dmg 등)을 첨부
- 파일명 예시: `game-v1.0.1.zip`

5. "Publish release" 클릭

### 방법 2: GitHub CLI 사용

```bash
# GitHub CLI 설치 필요
gh release create v1.0.1 \
  --title "버전 1.0.1" \
  --notes "새로운 기능 추가" \
  game-v1.0.1.zip
```

### 방법 3: Git 태그로 릴리스 생성

```bash
# 태그 생성
git tag -a v1.0.1 -m "버전 1.0.1"

# 태그 푸시
git push origin v1.0.1

# GitHub에서 수동으로 Release 생성 (Assets 추가)
```

---

## 🖥️ 클라이언트 앱 설정

### 1단계: 버전 정보 업데이트

`package.json` 파일의 버전을 업데이트:

```json
{
  "name": "my-game-app",
  "version": "1.0.0",  // 👈 현재 버전
  ...
}
```

### 2단계: 런처 파일 준비

다음 파일들이 같은 폴더에 있어야 합니다:
- `game-launcher.html`
- `launcher-style.css`
- `launcher-app.js`
- `updateChecker.js`

### 3단계: 런처 실행

#### 웹 브라우저에서 실행
```bash
# 간단한 HTTP 서버 실행 (Python)
python3 -m http.server 8000

# 또는 Node.js http-server
npx http-server .
```

브라우저에서 `http://localhost:8000/game-launcher.html` 접속

#### Electron 앱으로 패키징 (권장)

Electron을 사용하면 독립 실행 가능한 데스크톱 앱으로 만들 수 있습니다.

```bash
# Electron 설치
npm install electron electron-builder --save-dev

# electron-main.js 생성
cat > electron-main.js << 'EOF'
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('game-launcher.html');
}

app.whenReady().then(createWindow);
EOF

# package.json에 스크립트 추가
{
  "scripts": {
    "start": "electron electron-main.js"
  }
}

# 실행
npm start
```

---

## 🧪 테스트 방법

### 1단계: 초기 버전 설정

`package.json`:
```json
{
  "version": "1.0.0"
}
```

`launcher-app.js`:
```javascript
this.currentVersion = '1.0.0';
```

### 2단계: GitHub Release 생성

1. GitHub에서 `v1.0.1` 릴리스 생성
2. 게임 파일 업로드 (예: `game-v1.0.1.zip`)

### 3단계: 런처 실행 및 확인

1. `game-launcher.html` 실행
2. "업데이트 확인 중..." 메시지 표시
3. 몇 초 후 "새로운 업데이트가 있습니다!" 표시
4. 버전 비교: `1.0.0 → 1.0.1`
5. "업데이트 다운로드" 버튼 클릭
6. GitHub Release 페이지로 이동 또는 파일 다운로드

### 4단계: 자동 확인 테스트

1. 자동 업데이트 확인 체크박스 활성화
2. 1시간 대기 또는 코드에서 간격을 10초로 변경하여 테스트:

```javascript
// launcher-app.js 수정 (테스트용)
this.autoCheckInterval = this.updateChecker.startAutoCheck(10000, ...); // 10초마다
```

---

## 🔍 문제 해결

### Q1: "업데이트 확인 실패" 오류

**원인**:
- GitHub API 호출 실패
- 저장소 정보가 잘못됨
- 릴리스가 없음

**해결**:
1. 브라우저 개발자 도구(F12) → Console 탭 확인
2. Network 탭에서 API 요청 확인
3. `https://api.github.com/repos/사용자명/저장소명/releases/latest` 직접 접속해서 확인

### Q2: CORS 오류

**원인**:
- 로컬 파일(`file://`)에서 실행 시 CORS 정책 위반

**해결**:
- HTTP 서버를 통해 실행 (위 "런처 실행" 참고)
- 브라우저 CORS 비활성화 (개발용만, 권장하지 않음)

### Q3: 릴리스는 있는데 버전이 감지되지 않음

**원인**:
- 릴리스 태그가 `v`로 시작하지 않음
- Semantic Versioning 형식이 아님

**해결**:
- 태그를 `v1.0.0` 형식으로 생성
- `updateChecker.js`의 버전 파싱 로직 확인

### Q4: Private 저장소에서 작동하지 않음

**원인**:
- 인증 없이 Private API 접근 시도

**해결**:
- GitHub Personal Access Token 생성 및 적용
- 또는 Public 저장소 사용

### Q5: 다운로드 버튼이 작동하지 않음

**원인**:
- Release에 Assets(파일)이 첨부되지 않음

**해결**:
- GitHub Release 페이지에서 Assets 업로드
- 또는 `zipball_url`(소스코드 압축)을 사용하도록 설정

---

## 🎓 고급 기능 구현

### 1. 자동 설치 기능

현재는 다운로드만 지원합니다. 자동 설치를 구현하려면:

**Electron 앱**:
```javascript
// electron-updater 패키지 사용
const { autoUpdater } = require('electron-updater');

autoUpdater.checkForUpdatesAndNotify();
```

**웹 앱**:
- Service Worker를 사용한 백그라운드 업데이트
- IndexedDB에 새 버전 캐싱

### 2. 델타 업데이트 (차분 업데이트)

전체 파일이 아닌 변경된 부분만 다운로드:
- [BsDiff](http://www.daemonology.net/bsdiff/) 알고리즘 사용
- 서버에서 패치 파일 생성

### 3. 롤백 기능

업데이트 실패 시 이전 버전으로 복원:
- 이전 버전 백업
- 설치 실패 감지
- 자동 롤백

### 4. 채널별 업데이트 (Stable/Beta)

```javascript
new UpdateChecker({
  owner: 'k30339035',
  repo: 'mytest',
  channel: 'beta' // 'stable', 'beta', 'alpha'
});
```

GitHub Releases에서 "Pre-release" 옵션 사용

---

## 📊 배포 프로세스 예시

### 개발 → 배포 워크플로우

```bash
# 1. 새 기능 개발
git checkout -b feature/new-feature
# ... 코드 작성 ...

# 2. 메인 브랜치에 병합
git checkout main
git merge feature/new-feature

# 3. 버전 업데이트
npm version patch  # 1.0.0 → 1.0.1
# 또는
npm version minor  # 1.0.0 → 1.1.0
# 또는
npm version major  # 1.0.0 → 2.0.0

# 4. 푸시
git push origin main --tags

# 5. 게임 빌드
npm run build  # 또는 게임 패키징 스크립트

# 6. GitHub Release 생성
gh release create v1.0.1 \
  --title "버전 1.0.1" \
  --notes-file CHANGELOG.md \
  dist/game-v1.0.1.zip

# 7. 클라이언트 자동 업데이트 확인
# (사용자가 런처를 실행하면 자동으로 감지)
```

### GitHub Actions 자동화 (선택)

`.github/workflows/release.yml`:
```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Game
        run: |
          npm install
          npm run build

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/game-*.zip
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] `package.json` 버전 업데이트
- [ ] `launcher-app.js`에 올바른 GitHub 정보 입력
- [ ] 게임 파일 빌드 완료
- [ ] GitHub Release 생성 (태그 `v` 접두사)
- [ ] Release에 Assets 파일 업로드
- [ ] 릴리스 노트 작성
- [ ] 테스트 환경에서 업데이트 확인
- [ ] 사용자에게 업데이트 공지

---

## 🤝 지원 및 문의

- GitHub Issues: [https://github.com/k30339035/mytest/issues](https://github.com/k30339035/mytest/issues)
- 문서 업데이트: Pull Request 환영합니다!

---

## 📜 라이선스

MIT License

---

**마지막 업데이트**: 2025-11-12
**작성자**: Claude AI Assistant
**버전**: 1.0.0
