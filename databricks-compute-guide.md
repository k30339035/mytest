# Azure Databricks Compute 완전 가이드

## 목차
1. [Compute란 무엇인가?](#compute란-무엇인가)
2. [Compute 유형](#compute-유형)
3. [Cluster 상세 설명](#cluster-상세-설명)
4. [주요 용어 설명](#주요-용어-설명)
5. [Cluster 구성 옵션](#cluster-구성-옵션)
6. [모범 사례](#모범-사례)

---

## Compute란 무엇인가?

**Compute**는 Databricks에서 데이터 처리 작업을 실행하는 데 필요한 **컴퓨팅 리소스(서버/가상머신)**를 의미합니다.

쉽게 말해:
- 노트북 코드를 실행하거나
- 데이터 분석을 수행하거나
- ML 모델을 학습시키려면
- **반드시 Compute(컴퓨터)가 필요**합니다

---

## Compute 유형

Azure Databricks에는 4가지 주요 Compute 유형이 있습니다:

### 1. **All-Purpose Clusters (범용 클러스터)**
- **용도**: 노트북 개발, 탐색적 데이터 분석, 대화형 작업
- **특징**:
  - 수동으로 시작/중지 가능
  - 여러 사용자가 동시에 사용 가능
  - 비용이 상대적으로 높음 (프리미엄 요금)
- **사용 시나리오**: 데이터 분석가가 Jupyter 노트북으로 데이터 탐색

### 2. **Job Clusters (작업 클러스터)**
- **용도**: 자동화된 작업(Jobs) 실행
- **특징**:
  - 작업 실행 시 자동 생성
  - 작업 완료 후 자동 종료
  - 비용 효율적 (프리미엄 요금 없음)
- **사용 시나리오**: 매일 밤 자동으로 실행되는 ETL 파이프라인

### 3. **SQL Warehouses (SQL 웨어하우스)**
- **용도**: SQL 쿼리 실행
- **특징**:
  - SQL 전용 최적화
  - 자동 확장/축소
  - BI 도구 연결 가능
- **사용 시나리오**: Tableau, Power BI로 데이터 시각화

### 4. **Instance Pools (인스턴스 풀)**
- **용도**: VM을 미리 준비해두어 클러스터 시작 시간 단축
- **특징**:
  - 사용하지 않는 VM을 대기 상태로 유지
  - 클러스터 시작 속도 향상
- **사용 시나리오**: 클러스터를 자주 시작/중지하는 환경

---

## Cluster 상세 설명

### Cluster 생명주기

```
생성 → 시작 중 → 실행 중 → 유휴 → 종료 중 → 종료됨
         (Starting)  (Running)  (Idle)   (Terminating) (Terminated)
```

**각 상태 설명**:
- **Pending**: 클러스터 생성 요청이 대기 중
- **Starting**: VM을 프로비저닝하고 Spark를 초기화하는 중
- **Running**: 작업 실행 가능한 상태
- **Restarting**: 구성 변경 등으로 재시작 중
- **Terminating**: 종료 프로세스 진행 중
- **Terminated**: 완전히 종료됨 (비용 발생 안 함)

### Cluster 모드

#### 1. **Standard Mode (표준 모드)**
- 일반적인 데이터 처리 작업용
- 모든 사용자가 모든 데이터에 접근 가능
- 성능이 우수함

#### 2. **High Concurrency Mode (고동시성 모드)**
- 여러 사용자가 동시에 사용할 때 최적화
- 사용자/그룹별 데이터 접근 제어 가능 (Table ACL)
- 리소스를 효율적으로 공유
- **주의**: Python, Scala만 지원 (R 불가)

#### 3. **Single Node (단일 노드)**
- Driver만 있고 Worker가 없음
- 소규모 데이터 처리나 테스트용
- 비용 절감 가능

---

## 주요 용어 설명

### 노드 관련 용어

#### **Driver Node (드라이버 노드)**
- **역할**: 클러스터의 "지휘자"
- **하는 일**:
  - Spark 작업을 조율하고 관리
  - 노트북 명령을 받아서 처리
  - Worker들에게 작업 분배
  - 결과 수집 및 반환
- **비유**: 오케스트라의 지휘자

#### **Worker Node (워커 노드)**
- **역할**: 실제 데이터를 처리하는 "일꾼"
- **하는 일**:
  - Driver의 지시를 받아 데이터 처리
  - 병렬로 작업 수행
  - 처리 결과를 Driver에게 반환
- **비유**: 오케스트라의 연주자들

### VM 크기 관련 용어

#### **Worker Type (워커 유형)**
- 각 Worker 노드의 VM 크기
- 예시:
  - `Standard_DS3_v2`: 4 Core, 14GB RAM
  - `Standard_DS4_v2`: 8 Core, 28GB RAM
  - `Standard_E8s_v3`: 8 Core, 64GB RAM (메모리 최적화)

#### **Driver Type (드라이버 유형)**
- Driver 노드의 VM 크기
- 보통 Worker와 같거나 더 큰 크기 사용

### 스케일링 관련 용어

#### **Autoscaling (자동 확장)**
- **기능**: 작업 부하에 따라 Worker 수를 자동으로 조정
- **설정 예시**:
  - Min workers: 2 (최소 2대)
  - Max workers: 8 (최대 8대)
- **장점**: 비용 절감 + 성능 최적화
- **동작 방식**:
  - 작업이 많으면 → Worker 추가
  - 작업이 적으면 → Worker 제거

#### **Auto Termination (자동 종료)**
- **기능**: 일정 시간 사용하지 않으면 자동으로 클러스터 종료
- **설정 예시**: "120분 후 자동 종료"
- **목적**: 불필요한 비용 방지

### Databricks Runtime 관련

#### **Databricks Runtime**
- **의미**: Databricks가 제공하는 "실행 환경 패키지"
- **포함 내용**:
  - Apache Spark
  - Python, Scala, R, Java
  - 최적화된 라이브러리
  - 보안 패치

#### **Runtime 버전 종류**

1. **Standard Runtime**
   - 예: `13.3 LTS (Scala 2.12, Spark 3.4.1)`
   - 일반적인 데이터 처리용

2. **ML Runtime (Machine Learning)**
   - 예: `13.3 LTS ML (Scala 2.12, Spark 3.4.1)`
   - ML 라이브러리 포함:
     - TensorFlow
     - PyTorch
     - Scikit-learn
     - XGBoost

3. **GPU Runtime**
   - 예: `13.3 LTS ML (GPU, Scala 2.12, Spark 3.4.1)`
   - GPU 가속 지원
   - 딥러닝 학습에 최적화

4. **Photon Runtime**
   - 예: `13.3 LTS (Photon, Scala 2.12, Spark 3.4.1)`
   - Databricks의 차세대 쿼리 엔진
   - SQL 쿼리 성능 향상

#### **LTS (Long Term Support)**
- 장기 지원 버전
- 안정성이 검증됨
- 프로덕션 환경 권장

---

## Cluster 구성 옵션

### 1. **Cluster 이름**
```
예: analytics-cluster-prod
```
- 용도를 알 수 있게 명명

### 2. **Policy (정책)**
- 관리자가 설정한 클러스터 생성 규칙
- 예시:
  - "최대 8개 노드까지만"
  - "특정 VM 타입만 사용"
  - "자동 종료 필수"

### 3. **Access Mode (접근 모드)**

#### **Single User (단일 사용자)**
- 한 명만 사용 가능
- Unity Catalog와 함께 사용
- 가장 안전함

#### **Shared (공유)**
- 여러 사용자가 동시 사용
- Unity Catalog 필요
- Python, SQL, R 지원

#### **No Isolation Shared (격리 없는 공유)**
- 레거시 공유 모드
- 보안 격리 없음
- 신규 사용 비권장

### 4. **Databricks Runtime Version**
```
예시 선택:
- 13.3 LTS (Scala 2.12, Spark 3.4.1)
- 13.3 LTS ML (includes TensorFlow, PyTorch)
```

### 5. **Use Photon Acceleration**
- 체크박스 옵션
- SQL/DataFrame 작업 성능 향상
- 추가 비용 없음 (권장)

### 6. **Node Type (노드 유형)**

**선택 기준**:

| 작업 유형 | 추천 VM 시리즈 | 예시 |
|---------|------------|-----|
| 일반 데이터 처리 | Standard_DS 시리즈 | Standard_DS3_v2 |
| 메모리 집약적 | Standard_E 시리즈 | Standard_E8s_v3 |
| 컴퓨팅 집약적 | Standard_F 시리즈 | Standard_F8s_v2 |
| GPU 작업 | Standard_NC 시리즈 | Standard_NC6s_v3 |

### 7. **Cluster Size (클러스터 크기)**

#### **Fixed Size (고정 크기)**
```
Workers: 4개
```
- Worker 수가 고정됨
- 예측 가능한 성능

#### **Autoscaling (자동 확장)**
```
Min workers: 2
Max workers: 8
```
- 부하에 따라 동적 조정
- 비용 효율적

### 8. **Auto Termination (자동 종료)**
```
예: 120 minutes
```
- 설정 시간 동안 미사용 시 자동 종료
- **필수 권장**: 비용 절감

### 9. **Advanced Options (고급 옵션)**

#### **Spot Instances (스팟 인스턴스)**
- Azure Spot VM 사용
- 최대 90% 비용 절감
- **주의**: 언제든지 회수될 수 있음
- **권장 사용처**:
  - 개발/테스트 환경
  - 중단 가능한 작업
- **비권장**: 프로덕션 중요 작업

#### **Tags (태그)**
```
Environment: Production
Team: Data-Analytics
Cost-Center: 1234
```
- 비용 추적 및 관리용
- Azure 청구서에 반영

#### **Init Scripts (초기화 스크립트)**
- 클러스터 시작 시 자동 실행되는 스크립트
- 용도:
  - 사용자 정의 라이브러리 설치
  - 환경 변수 설정
  - 보안 설정

#### **Spark Config (Spark 구성)**
```
spark.sql.adaptive.enabled true
spark.sql.adaptive.coalescePartitions.enabled true
```
- Spark 동작 세부 조정
- 성능 튜닝용

#### **Environment Variables (환경 변수)**
```
API_KEY=xxxxx
DATABASE_URL=jdbc:...
```
- 애플리케이션 설정값 전달

#### **Logging (로깅)**
- 클러스터 로그를 저장할 위치 설정
- Azure Blob Storage 경로 지정

---

## 모범 사례

### 1. **개발 vs 프로덕션 분리**

```
개발 환경:
- Autoscaling: 1-4 workers
- Auto Termination: 30분
- Spot Instances: 사용
- 비용 최적화 우선

프로덕션 환경:
- Fixed Size 또는 보수적인 Autoscaling
- Auto Termination: 사용 안 함 (또는 긴 시간)
- On-Demand Instances (Spot 안 함)
- 안정성 우선
```

### 2. **Auto Termination 필수 설정**
- 개발 클러스터: 30-60분
- 실험용 클러스터: 120분
- 비용 낭비 방지

### 3. **적절한 클러스터 크기 선택**
```
작은 데이터 (<10GB):
- Single Node 또는 2-4 workers

중간 데이터 (10GB-1TB):
- 4-16 workers

대규모 데이터 (>1TB):
- 16+ workers
- Autoscaling 활용
```

### 4. **Job에는 Job Cluster 사용**
- All-Purpose Cluster 대비 30% 저렴
- 자동화된 작업은 반드시 Job Cluster로

### 5. **Photon 활성화**
- SQL/DataFrame 작업이 많다면 필수
- 추가 비용 없이 성능 향상

### 6. **적절한 Runtime 선택**
```
일반 ETL → Standard Runtime
ML 작업 → ML Runtime
딥러닝 → GPU ML Runtime
BI/SQL → Photon Runtime
```

### 7. **태그 활용**
```
- Team: 팀 이름
- Project: 프로젝트명
- Environment: dev/staging/prod
- Owner: 담당자 이메일
```
- 비용 추적 및 책임 소재 명확화

---

## 실전 예시

### 시나리오 1: 데이터 분석가의 탐색 작업

**요구사항**: 중간 크기 데이터 탐색, 비용 효율성

**설정**:
```
- Cluster Mode: Standard
- Access Mode: Single User
- Runtime: 13.3 LTS (Photon)
- Worker Type: Standard_DS3_v2
- Autoscaling: 2-8 workers
- Auto Termination: 60 minutes
- Spot Instances: ✓ 사용
```

### 시나리오 2: 프로덕션 ETL 파이프라인

**요구사항**: 안정성, 예측 가능성

**설정**:
```
- Cluster Type: Job Cluster
- Runtime: 13.3 LTS (Photon)
- Worker Type: Standard_E8s_v3 (메모리 최적화)
- Fixed Size: 8 workers
- Auto Termination: 작업 완료 시 자동 종료
- Spot Instances: ✗ 사용 안 함
```

### 시나리오 3: 딥러닝 모델 학습

**요구사항**: GPU 가속, ML 라이브러리

**설정**:
```
- Cluster Mode: Single Node (소규모 데이터)
- Runtime: 13.3 LTS ML (GPU)
- Driver Type: Standard_NC6s_v3 (GPU)
- Auto Termination: 120 minutes
```

### 시나리오 4: 여러 팀원이 사용하는 공유 환경

**요구사항**: 다중 사용자, 보안

**설정**:
```
- Cluster Mode: High Concurrency
- Access Mode: Shared
- Runtime: 13.3 LTS
- Worker Type: Standard_DS4_v2
- Autoscaling: 4-16 workers
- Auto Termination: 120 minutes
- Enable Table ACL: ✓
```

---

## 비용 최적화 팁

### 1. **클러스터 사용 패턴 분석**
- Databricks 콘솔 → Compute → 각 클러스터 → Metrics
- 실제 사용률 확인 후 크기 조정

### 2. **미사용 클러스터 정리**
- 정기적으로 Terminated 상태 클러스터 삭제
- 오래된 All-Purpose Cluster 검토

### 3. **Spot Instance 활용**
- 개발 환경 100% 적용
- 프로덕션: Worker만 Spot 사용 (Driver는 On-Demand)

### 4. **Pool 활용**
- 자주 시작/중지하는 환경
- Pool로 Idle VM 유지 → 시작 시간 단축

### 5. **적절한 Cluster 선택**
```
작업 유형          → 클러스터 타입
--------------------------------
노트북 개발        → All-Purpose
스케줄된 작업      → Job Cluster
SQL 분석           → SQL Warehouse
빠른 시작 필요     → Pool 사용
```

---

## Compute 화면 메뉴 구조

### Compute 탭 (왼쪽 사이드바)

```
Compute
├── All-Purpose Clusters
│   ├── [클러스터 목록]
│   └── Create Cluster 버튼
├── Job Clusters
│   └── [작업별 클러스터 목록]
├── Instance Pools
│   ├── [Pool 목록]
│   └── Create Pool 버튼
└── SQL Warehouses
    ├── [Warehouse 목록]
    └── Create SQL Warehouse 버튼
```

### 클러스터 상세 화면 탭

```
[클러스터 이름]
├── Configuration (구성)
│   └── 모든 설정 확인/수정
├── Event Log (이벤트 로그)
│   └── 시작/종료/오류 이력
├── Spark UI
│   └── Spark 작업 모니터링
├── Driver Logs
│   └── Driver 노드 로그
├── Metrics
│   └── CPU, 메모리 사용률
├── Libraries
│   └── 설치된 라이브러리 관리
└── Apps
    └── 실행 중인 애플리케이션
```

---

## 자주 묻는 질문 (FAQ)

### Q1: Cluster를 종료하면 데이터가 사라지나요?
**A**: 아니요. 클러스터는 단지 "컴퓨터"입니다.
- 데이터는 Azure Storage (ADLS, Blob)에 저장됨
- 클러스터 종료해도 데이터는 그대로 유지
- 다시 시작하면 동일한 데이터 접근 가능

### Q2: All-Purpose vs Job Cluster 차이는?
**A**:
- **All-Purpose**: 대화형 작업용, 수동 관리, 비쌈
- **Job**: 자동화 작업용, 자동 관리, 저렴 (30% 할인)

### Q3: Autoscaling을 사용하면 작업이 느려지나요?
**A**: 아니요.
- Worker 추가는 수 분 내 완료
- 작업이 이미 시작된 상태에서 동적으로 확장
- 오히려 비용 대비 성능이 우수

### Q4: Spot Instance를 사용해도 안전한가요?
**A**: 용도에 따라 다름
- ✓ 안전: 개발, 테스트, 재실행 가능한 작업
- ✗ 위험: 중단되면 안 되는 프로덕션 작업
- 팁: Worker만 Spot, Driver는 On-Demand

### Q5: 언제 Single Node를 사용하나요?
**A**:
- 소규모 데이터 (<1GB)
- 단순 스크립트 실행
- 개발/테스트
- ML 모델 학습 (데이터가 작을 때)

### Q6: Photon은 무조건 켜야 하나요?
**A**: 대부분 Yes
- SQL, DataFrame 작업이 많으면 필수
- 추가 비용 없음
- 예외: 복잡한 사용자 정의 Spark 코드 사용 시

### Q7: High Concurrency 모드는 언제 사용하나요?
**A**:
- 여러 사용자가 동시에 같은 클러스터 사용
- 사용자별 데이터 접근 제어 필요
- 리소스 효율성 중요
- **주의**: R은 지원 안 됨

---

## 참고 자료

### Azure VM 크기 선택 가이드

**General Purpose (범용)**
- Standard_DS 시리즈: 균형 잡힌 CPU/메모리
- 대부분의 작업에 적합

**Compute Optimized (컴퓨팅 최적화)**
- Standard_F 시리즈: CPU 집약적 작업
- 복잡한 계산, 시뮬레이션

**Memory Optimized (메모리 최적화)**
- Standard_E 시리즈: 대용량 메모리
- 대규모 조인, 캐싱, 인메모리 분석

**Storage Optimized (스토리지 최적화)**
- Standard_L 시리즈: 고속 로컬 디스크
- 대규모 로그 처리, NoSQL DB

**GPU Enabled (GPU)**
- Standard_NC 시리즈: NVIDIA GPU
- 딥러닝, 과학 계산

### Databricks Runtime 버전 이해

```
예: 13.3 LTS ML (GPU, Scala 2.12, Spark 3.4.1)

13.3       → Databricks Runtime 버전
LTS        → Long Term Support (장기 지원)
ML         → Machine Learning 라이브러리 포함
GPU        → GPU 지원
Scala 2.12 → Scala 버전
Spark 3.4.1→ Apache Spark 버전
```

---

## 용어 사전

| 한글 용어 | 영문 용어 | 설명 |
|---------|---------|-----|
| 컴퓨트 | Compute | 컴퓨팅 리소스 (서버/VM) |
| 클러스터 | Cluster | 여러 노드로 구성된 컴퓨팅 그룹 |
| 노드 | Node | 개별 가상 머신 |
| 드라이버 | Driver | 작업을 조율하는 마스터 노드 |
| 워커 | Worker | 실제 작업을 수행하는 노드 |
| 런타임 | Runtime | 실행 환경 (Spark, Python 등) |
| 자동 확장 | Autoscaling | 부하에 따라 노드 수 자동 조정 |
| 자동 종료 | Auto Termination | 미사용 시 자동으로 클러스터 종료 |
| 스팟 인스턴스 | Spot Instance | 저렴하지만 회수 가능한 VM |
| 풀 | Pool | 미리 준비된 VM 저장소 |
| 웨어하우스 | Warehouse | SQL 전용 컴퓨트 |

---

## 실습 가이드

### 첫 번째 클러스터 생성하기

1. **Compute 메뉴 접속**
   - 왼쪽 사이드바 → Compute

2. **Create Cluster 클릭**

3. **기본 설정**
   ```
   Cluster name: my-first-cluster
   Policy: Unrestricted (또는 기본값)
   Access Mode: Single User
   Runtime: 13.3 LTS (또는 최신 LTS)
   ```

4. **노드 설정**
   ```
   Node type: Standard_DS3_v2
   Autoscaling: ✓ Enable
   Min workers: 1
   Max workers: 3
   ```

5. **자동 종료 설정**
   ```
   Auto Termination: ✓ Enable
   After: 30 minutes
   ```

6. **Create Cluster 클릭**

7. **상태 확인**
   - Starting → Running 전환 대기 (약 3-5분)

8. **테스트**
   - 새 노트북 생성
   - 클러스터 연결
   - 간단한 코드 실행:
   ```python
   # Python
   print("Hello from Databricks!")
   df = spark.range(1000)
   df.count()
   ```

---

이 가이드가 Azure Databricks Compute 화면을 이해하는 데 도움이 되셨기를 바랍니다. 추가 질문이 있으시면 언제든지 문의해 주세요!
