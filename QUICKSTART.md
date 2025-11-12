# 🚀 빠른 시작 가이드 - 자동 업데이트 시스템

## 5분 안에 시작하기

### 1️⃣ 파일 확인 (1분)

다음 파일들이 있는지 확인하세요:
```
✅ package.json
✅ updateChecker.js
✅ game-launcher.html
✅ launcher-style.css
✅ launcher-app.js
```

### 2️⃣ GitHub 정보 설정 (2분)

`launcher-app.js` 파일을 열고 11-12번째 줄을 수정하세요:

```javascript
this.updateChecker = new UpdateChecker({
  owner: 'YOUR_GITHUB_USERNAME',  // 👈 여기 수정
  repo: 'YOUR_REPO_NAME',         // 👈 여기 수정
  currentVersion: this.currentVersion
});
```

**예시**:
```javascript
owner: 'k30339035',
repo: 'mytest',
```

### 3️⃣ 테스트 실행 (2분)

#### 방법 A: Python 사용
```bash
python3 -m http.server 8000
```

#### 방법 B: Node.js 사용
```bash
npx http-server .
```

브라우저에서 열기:
```
http://localhost:8000/game-launcher.html
```

---

## 🎯 첫 번째 릴리스 만들기

### 1. GitHub에 로그인

저장소 페이지로 이동

### 2. "Releases" 클릭

오른쪽 사이드바에서 찾기

### 3. "Create a new release" 클릭

### 4. 릴리스 정보 입력

```
Tag version:   v1.0.1
Title:         버전 1.0.1 - 첫 릴리스
Description:   첫 번째 릴리스입니다!
```

### 5. 파일 업로드

"Attach binaries" 영역에 게임 파일(.zip) 드래그

### 6. "Publish release" 클릭

완료! 🎉

---

## 🧪 업데이트 테스트

1. 런처 실행: `game-launcher.html` 열기
2. "업데이트 확인 중..." 표시
3. 2-3초 후: "새로운 업데이트가 있습니다!" 표시
4. "업데이트 다운로드" 클릭
5. 다운로드 시작! ✅

---

## ❓ 문제가 생겼나요?

### 🔴 "업데이트 확인 실패" 오류

**체크리스트**:
- [ ] GitHub 사용자명과 저장소 이름이 정확한가요?
- [ ] 릴리스를 생성했나요?
- [ ] 릴리스 태그가 `v`로 시작하나요? (예: `v1.0.1`)
- [ ] 저장소가 Public인가요? (Private는 토큰 필요)

**테스트 URL**:
```
https://api.github.com/repos/사용자명/저장소명/releases/latest
```
위 URL을 브라우저에서 열어보세요. JSON 데이터가 보이면 정상입니다.

### 🟡 페이지가 로드되지 않음

**체크리스트**:
- [ ] HTTP 서버를 실행했나요? (`file://`은 CORS 오류 발생)
- [ ] 포트가 사용 중이 아닌가요?
- [ ] 올바른 URL로 접속했나요? (localhost:8000)

### 🟢 전체 문서 보기

자세한 내용은 [`README_UPDATE_SYSTEM.md`](./README_UPDATE_SYSTEM.md) 참고

---

## 📞 도움이 필요하신가요?

GitHub Issues에 질문을 남겨주세요!

**즐거운 게임 개발 되세요!** 🎮✨
