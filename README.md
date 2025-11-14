# AKS Virtual Machine Schedule Manager

AKS(Azure Kubernetes Service)의 가상 머신 스케줄을 한 화면에서 관리할 수 있는 웹 인터페이스입니다.

## 주요 기능

- **Azure 리소스 관리**
  - 구독 및 리소스 그룹 조회
  - AKS 클러스터 목록 확인
  - VMSS(Virtual Machine Scale Sets) 관리

- **스케줄 관리**
  - Azure Automation 스케줄 조회
  - 새 스케줄 생성 (일회성, 반복)
  - 스케줄 활성화/비활성화
  - 스케줄 삭제

- **즉시 스케일 조정**
  - VMSS 인스턴스 수 즉시 조정
  - 실시간 상태 확인

## 사전 요구사항

- Node.js (v14 이상)
- PowerShell
- Azure PowerShell 모듈 (Az)
- Azure 계정 로그인 상태

### Azure PowerShell 설정

```powershell
# Azure PowerShell 모듈 설치 (관리자 권한)
Install-Module -Name Az -AllowClobber -Scope CurrentUser

# Azure 로그인
Connect-AzAccount

# 구독 선택 (여러 구독이 있는 경우)
Set-AzContext -SubscriptionId "your-subscription-id"
```

## 설치 방법

1. 의존성 패키지 설치
```bash
npm install
```

2. 서버 실행
```bash
npm start
```

3. 브라우저에서 접속
```
http://localhost:3000
```

## 사용 방법

### 1. 리소스 선택

1. 구독(Subscription) 선택
2. 리소스 그룹 선택
3. Automation Account 이름 입력
4. "리소스 로드" 버튼 클릭

### 2. 스케줄 관리

#### 스케줄 생성
1. "새 스케줄 추가" 버튼 클릭
2. 스케줄 정보 입력:
   - 스케줄 이름
   - 설명 (선택)
   - 시작 시간
   - 빈도 (한 번, 매일, 매시간, 매주, 매월)
   - 간격 (선택)
   - 시간대
3. "저장" 버튼 클릭

#### 스케줄 활성화/비활성화
- 각 스케줄 카드의 "활성화" 또는 "비활성화" 버튼 클릭

#### 스케줄 삭제
- 각 스케줄 카드의 "삭제" 버튼 클릭

### 3. VMSS 즉시 스케일 조정

1. VMSS 선택
2. 원하는 인스턴스 수 입력
3. "스케일 조정 실행" 버튼 클릭

## 프로젝트 구조

```
.
├── server.js              # Express 서버 및 PowerShell API
├── package.json           # 프로젝트 설정 및 의존성
└── public/
    ├── index.html         # 메인 HTML 페이지
    ├── styles.css         # 스타일시트
    └── app.js             # 클라이언트 JavaScript
```

## API 엔드포인트

### Azure 리소스
- `GET /api/current-context` - 현재 Azure 컨텍스트 조회
- `GET /api/subscriptions` - 구독 목록 조회
- `GET /api/resource-groups` - 리소스 그룹 조회
- `GET /api/aks-clusters` - AKS 클러스터 조회
- `GET /api/vmss` - VMSS 조회

### 스케줄 관리
- `GET /api/schedules` - 스케줄 목록 조회
- `POST /api/schedules` - 새 스케줄 생성
- `PUT /api/schedules/:scheduleName` - 스케줄 업데이트
- `DELETE /api/schedules/:scheduleName` - 스케줄 삭제

### VMSS 관리
- `POST /api/vmss/scale` - VMSS 스케일 조정

## 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Azure 연동**: PowerShell, Azure PowerShell (Az) 모듈

## 주의사항

- Azure CLI는 작동하지 않으므로 PowerShell만 사용합니다
- Azure 계정에 미리 로그인되어 있어야 합니다
- Automation Account가 없는 경우 Azure Portal에서 먼저 생성해야 합니다

## 문제 해결

### Azure 연결 실패
```powershell
# Azure 로그인 상태 확인
Get-AzContext

# 다시 로그인
Connect-AzAccount
```

### PowerShell 실행 정책 오류
```powershell
# 실행 정책 변경 (관리자 권한)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 라이선스

ISC