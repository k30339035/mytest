# Azure Reservation Recommendation PowerShell 가이드

## 개요

Azure Reservation Recommendations는 Azure에서 사용 패턴을 분석하여 예약 인스턴스(Reserved Instances) 구매를 권장하는 기능입니다. 예약 인스턴스를 통해 최대 72%까지 비용을 절감할 수 있습니다.

## 사전 요구사항

### 1. Azure PowerShell 모듈 설치

```powershell
# Az 모듈 설치
Install-Module -Name Az -Force -AllowClobber -Scope CurrentUser

# Az.Consumption 모듈 설치 (Reservation Recommendation 조회에 필요)
Install-Module -Name Az.Consumption -Force -AllowClobber -Scope CurrentUser
```

### 2. Azure 로그인

```powershell
# Azure 계정으로 로그인
Connect-AzAccount

# 특정 구독 선택
Set-AzContext -SubscriptionId "your-subscription-id"
```

## Reservation Recommendation 조회 방법

### 방법 1: Az.Consumption 모듈 사용 (권장)

```powershell
# 기본 조회
Get-AzConsumptionReservationRecommendation -Scope "subscriptions/your-subscription-id"

# 30일 분석 기간으로 조회
Get-AzConsumptionReservationRecommendation `
    -Scope "subscriptions/your-subscription-id" `
    -LookBackPeriod "Last30Days"

# 결과를 변수에 저장
$recommendations = Get-AzConsumptionReservationRecommendation `
    -Scope "subscriptions/your-subscription-id" `
    -LookBackPeriod "Last30Days"

# 결과 출력
$recommendations | Format-Table -Property ResourceType, SkuName, Location, RecommendedQuantity, NetSavings
```

### 방법 2: REST API 직접 호출

```powershell
# 액세스 토큰 획득
$token = (Get-AzAccessToken -ResourceUrl "https://management.azure.com").Token
$subscriptionId = "your-subscription-id"

# REST API 호출
$uri = "https://management.azure.com/subscriptions/$subscriptionId/providers/Microsoft.Consumption/reservationRecommendations?api-version=2023-05-01"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
$response.value | Format-Table
```

### 방법 3: 제공된 스크립트 사용

```powershell
# 현재 구독의 권장 사항 조회
.\Get-AzureReservationRecommendation.ps1

# 특정 구독 조회
.\Get-AzureReservationRecommendation.ps1 -SubscriptionId "your-subscription-id"

# 30일 분석 기간으로 조회
.\Get-AzureReservationRecommendation.ps1 -SubscriptionId "your-subscription-id" -LookBackPeriod "Last30Days"
```

## 주요 매개변수

### LookBackPeriod (분석 기간)
- `Last7Days`: 최근 7일
- `Last30Days`: 최근 30일 (권장)
- `Last60Days`: 최근 60일

### Scope (범위)
- `Single`: 단일 구독
- `Shared`: 공유 범위

## 결과 데이터 구조

Recommendation 객체의 주요 속성:

```powershell
ResourceType           # 리소스 유형 (예: VirtualMachines)
SkuName               # SKU 이름 (예: Standard_D2s_v3)
Location              # 위치 (예: eastus)
RecommendedQuantity   # 권장 수량
Term                  # 예약 기간 (P1Y, P3Y)
NetSavings           # 예상 절감액
CostWithNoReservedInstances  # 예약 없이 사용 시 비용
```

## 결과를 CSV로 저장

```powershell
# Recommendation 조회
$recommendations = Get-AzConsumptionReservationRecommendation `
    -Scope "subscriptions/your-subscription-id" `
    -LookBackPeriod "Last30Days"

# CSV로 저장
$recommendations | Export-Csv -Path ".\reservation-recommendations.csv" -NoTypeInformation -Encoding UTF8

# Excel에서 열기 쉬운 형식으로 저장
$recommendations | Select-Object ResourceType, SkuName, Location, RecommendedQuantity, Term, NetSavings |
    Export-Csv -Path ".\reservation-recommendations-summary.csv" -NoTypeInformation -Encoding UTF8
```

## 고급 활용

### 특정 리소스 타입만 필터링

```powershell
$recommendations = Get-AzConsumptionReservationRecommendation `
    -Scope "subscriptions/your-subscription-id" `
    -LookBackPeriod "Last30Days"

# VM 권장 사항만 필터링
$vmRecommendations = $recommendations | Where-Object { $_.ResourceType -eq "VirtualMachines" }
$vmRecommendations | Format-Table
```

### 절감액 기준으로 정렬

```powershell
$recommendations | Sort-Object -Property NetSavings -Descending | Format-Table
```

### 여러 구독 일괄 조회

```powershell
$subscriptionIds = @(
    "subscription-id-1",
    "subscription-id-2",
    "subscription-id-3"
)

$allRecommendations = @()

foreach ($subId in $subscriptionIds) {
    Write-Host "조회 중: $subId" -ForegroundColor Cyan

    $recs = Get-AzConsumptionReservationRecommendation `
        -Scope "subscriptions/$subId" `
        -LookBackPeriod "Last30Days"

    $allRecommendations += $recs
}

$allRecommendations | Export-Csv -Path ".\all-reservations.csv" -NoTypeInformation -Encoding UTF8
```

## Azure Portal에서 확인

PowerShell 외에도 Azure Portal에서 직접 확인할 수 있습니다:

1. [Azure Portal](https://portal.azure.com) 접속
2. "Cost Management + Billing" 검색
3. 좌측 메뉴에서 "Reservations" 선택
4. "Recommendations" 탭에서 권장 사항 확인

## Azure CLI 대안

```bash
# Azure CLI로 조회
az consumption reservation recommendation list \
    --subscription-id your-subscription-id

# JSON 형식으로 출력
az consumption reservation recommendation list \
    --subscription-id your-subscription-id \
    --output json
```

## 문제 해결

### 권한 오류
- 구독에 대한 읽기 권한(Reader) 이상이 필요합니다
- Cost Management Reader 역할이 권장됩니다

### 모듈이 없을 때
```powershell
Install-Module -Name Az.Consumption -Force -AllowClobber
```

### 권장 사항이 없을 때
- 사용량이 충분하지 않으면 권장 사항이 표시되지 않습니다
- 최소 7일 이상의 일관된 사용 패턴이 필요합니다

## 참고 자료

- [Azure Reservations 공식 문서](https://docs.microsoft.com/azure/cost-management-billing/reservations/)
- [Az.Consumption 모듈 문서](https://docs.microsoft.com/powershell/module/az.consumption/)
- [Azure 비용 관리 Best Practices](https://docs.microsoft.com/azure/cost-management-billing/costs/)
