<#
.SYNOPSIS
    Azure Reservation Recommendation 조회 스크립트

.DESCRIPTION
    Azure에서 제공하는 예약 인스턴스(Reserved Instance) 권장 사항을 조회합니다.
    비용 절감을 위한 reservation 구매 권장 사항을 확인할 수 있습니다.

.PARAMETER SubscriptionId
    조회할 Azure 구독 ID

.PARAMETER Scope
    권장 사항 범위 (Single, Shared)

.PARAMETER LookBackPeriod
    분석 기간 (Last7Days, Last30Days, Last60Days)

.EXAMPLE
    .\Get-AzureReservationRecommendation.ps1 -SubscriptionId "your-subscription-id"

.EXAMPLE
    .\Get-AzureReservationRecommendation.ps1 -SubscriptionId "your-subscription-id" -LookBackPeriod "Last30Days"
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId,

    [Parameter(Mandatory=$false)]
    [ValidateSet("Single", "Shared")]
    [string]$Scope = "Single",

    [Parameter(Mandatory=$false)]
    [ValidateSet("Last7Days", "Last30Days", "Last60Days")]
    [string]$LookBackPeriod = "Last7Days"
)

# Azure 모듈 확인 및 로드
Write-Host "Azure PowerShell 모듈 확인 중..." -ForegroundColor Cyan

if (-not (Get-Module -ListAvailable -Name Az.Consumption)) {
    Write-Host "Az.Consumption 모듈이 설치되어 있지 않습니다." -ForegroundColor Yellow
    Write-Host "다음 명령어로 설치하세요: Install-Module -Name Az.Consumption -Force -AllowClobber" -ForegroundColor Yellow
    exit
}

Import-Module Az.Consumption
Import-Module Az.Accounts

# Azure 로그인 확인
Write-Host "Azure 로그인 상태 확인 중..." -ForegroundColor Cyan
$context = Get-AzContext

if (-not $context) {
    Write-Host "Azure에 로그인되어 있지 않습니다. 로그인을 진행합니다..." -ForegroundColor Yellow
    Connect-AzAccount
}

# 구독 ID 설정
if (-not $SubscriptionId) {
    $currentContext = Get-AzContext
    $SubscriptionId = $currentContext.Subscription.Id
    Write-Host "현재 컨텍스트의 구독 사용: $SubscriptionId" -ForegroundColor Green
} else {
    Set-AzContext -SubscriptionId $SubscriptionId
    Write-Host "구독 설정 완료: $SubscriptionId" -ForegroundColor Green
}

# Reservation Recommendation 조회
Write-Host "`nReservation Recommendation 조회 중..." -ForegroundColor Cyan
Write-Host "  - Scope: $Scope" -ForegroundColor Gray
Write-Host "  - LookBack Period: $LookBackPeriod" -ForegroundColor Gray

try {
    # 방법 1: Az.Consumption 모듈 사용
    $recommendations = Get-AzConsumptionReservationRecommendation `
        -Scope "subscriptions/$SubscriptionId" `
        -LookBackPeriod $LookBackPeriod

    if ($recommendations) {
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "Reservation Recommendations" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green

        foreach ($rec in $recommendations) {
            Write-Host "리소스 타입: $($rec.ResourceType)" -ForegroundColor Yellow
            Write-Host "SKU: $($rec.SkuName)" -ForegroundColor White
            Write-Host "위치: $($rec.Location)" -ForegroundColor White
            Write-Host "권장 수량: $($rec.RecommendedQuantity)" -ForegroundColor Cyan
            Write-Host "예상 절감액: $($rec.NetSavings) $($rec.CostWithNoReservedInstances)" -ForegroundColor Green
            Write-Host "기간: $($rec.Term)" -ForegroundColor White
            Write-Host "----------------------------------------`n"
        }

        # CSV 파일로 저장
        $csvPath = ".\AzureReservationRecommendations_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
        $recommendations | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        Write-Host "결과가 CSV 파일로 저장되었습니다: $csvPath" -ForegroundColor Green
    } else {
        Write-Host "현재 Reservation 권장 사항이 없습니다." -ForegroundColor Yellow
    }

} catch {
    Write-Host "`n오류 발생: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n=== 대안 방법 ===" -ForegroundColor Cyan
    Write-Host "Azure Portal에서 확인:" -ForegroundColor Yellow
    Write-Host "1. Azure Portal (https://portal.azure.com) 접속" -ForegroundColor White
    Write-Host "2. 'Cost Management + Billing' 검색" -ForegroundColor White
    Write-Host "3. 좌측 메뉴에서 'Reservations' 선택" -ForegroundColor White
    Write-Host "4. 'Recommendations' 탭 확인" -ForegroundColor White

    Write-Host "`nAzure CLI 사용:" -ForegroundColor Yellow
    Write-Host "az consumption reservation recommendation list --subscription-id $SubscriptionId" -ForegroundColor White
}

Write-Host "`n스크립트 실행 완료." -ForegroundColor Green
