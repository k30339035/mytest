# Azure Databricks Storage Private Endpoint 설정 가이드

## 개요
Azure Databricks에서 Storage Accounts를 사용할 때 보안을 강화하기 위해 Private Endpoint를 구성하는 방법입니다.

## Private Endpoint란?
Private Endpoint는 Azure Virtual Network의 개인 IP 주소를 사용하여 Azure 서비스에 안전하게 연결하는 네트워크 인터페이스입니다. Public Internet을 거치지 않고 프라이빗 네트워크를 통해 스토리지에 접근합니다.

## 설정 단계

### 1. 전제 조건
- Azure Databricks Premium 티어 (VNet Injection 지원)
- Storage Account
- Virtual Network 및 Subnet
- 적절한 Azure 권한 (Network Contributor, Storage Account Contributor)

### 2. Storage Account Private Endpoint 생성

#### Azure Portal 방법:
1. Azure Portal에서 Storage Account로 이동
2. **Networking** → **Private endpoint connections** 선택
3. **+ Private endpoint** 클릭
4. 다음 정보 입력:
   - **Subscription**: 구독 선택
   - **Resource group**: 리소스 그룹 선택
   - **Name**: Private Endpoint 이름 (예: `pe-storage-databricks`)
   - **Region**: Databricks와 동일한 리전 선택

5. **Resource** 탭:
   - **Target sub-resource**:
     - `blob` (Blob Storage용)
     - `dfs` (ADLS Gen2용)
     - `file` (File Storage용)

6. **Virtual Network** 탭:
   - Databricks VNet과 Subnet 선택
   - Private IP configuration 설정

7. **DNS** 탭:
   - **Integrate with private DNS zone**: Yes 선택
   - Private DNS Zone 자동 생성 또는 기존 Zone 선택

8. **Review + create** → **Create**

#### Azure CLI 방법:
```bash
# 변수 설정
RESOURCE_GROUP="your-resource-group"
STORAGE_ACCOUNT="yourstorageaccount"
VNET_NAME="databricks-vnet"
SUBNET_NAME="private-endpoint-subnet"
PRIVATE_ENDPOINT_NAME="pe-storage-databricks"
LOCATION="koreacentral"

# Subnet에서 Private Endpoint Network Policy 비활성화
az network vnet subnet update \
  --name $SUBNET_NAME \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --disable-private-endpoint-network-policies true

# Storage Account Resource ID 가져오기
STORAGE_ID=$(az storage account show \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --query 'id' \
  --output tsv)

# Private Endpoint 생성 (Blob용)
az network private-endpoint create \
  --name $PRIVATE_ENDPOINT_NAME \
  --resource-group $RESOURCE_GROUP \
  --vnet-name $VNET_NAME \
  --subnet $SUBNET_NAME \
  --private-connection-resource-id $STORAGE_ID \
  --group-id blob \
  --connection-name "${PRIVATE_ENDPOINT_NAME}-connection" \
  --location $LOCATION

# Private DNS Zone 생성 및 연결
az network private-dns zone create \
  --resource-group $RESOURCE_GROUP \
  --name "privatelink.blob.core.windows.net"

az network private-dns link vnet create \
  --resource-group $RESOURCE_GROUP \
  --zone-name "privatelink.blob.core.windows.net" \
  --name "dns-link" \
  --virtual-network $VNET_NAME \
  --registration-enabled false

# DNS Zone Group 생성
az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name $PRIVATE_ENDPOINT_NAME \
  --name "default" \
  --private-dns-zone "privatelink.blob.core.windows.net" \
  --zone-name blob
```

### 3. Storage Account 방화벽 설정
Private Endpoint 생성 후 Public Access를 제한합니다:

```bash
# Public Network Access 제한
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --public-network-access Disabled

# 또는 선택된 네트워크만 허용
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --default-action Deny
```

### 4. Databricks 설정

#### 4.1 VNet Injection 설정
Databricks Workspace가 VNet Injection으로 배포되어야 합니다:

```bash
# Databricks Workspace VNet Injection 예시
az databricks workspace create \
  --name "databricks-workspace" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku premium \
  --vnet $VNET_NAME \
  --public-subnet "databricks-public-subnet" \
  --private-subnet "databricks-private-subnet"
```

#### 4.2 Databricks에서 Storage 접근 설정

**방법 1: Service Principal 사용 (권장)**
```python
# Databricks Notebook에서
spark.conf.set("fs.azure.account.auth.type.<storage-account>.dfs.core.windows.net", "OAuth")
spark.conf.set("fs.azure.account.oauth.provider.type.<storage-account>.dfs.core.windows.net",
               "org.apache.hadoop.fs.azurebfs.oauth2.ClientCredsTokenProvider")
spark.conf.set("fs.azure.account.oauth2.client.id.<storage-account>.dfs.core.windows.net",
               "<application-id>")
spark.conf.set("fs.azure.account.oauth2.client.secret.<storage-account>.dfs.core.windows.net",
               "<service-principal-secret>")
spark.conf.set("fs.azure.account.oauth2.client.endpoint.<storage-account>.dfs.core.windows.net",
               "https://login.microsoftonline.com/<tenant-id>/oauth2/token")

# ADLS Gen2 접근
df = spark.read.parquet("abfss://<container>@<storage-account>.dfs.core.windows.net/path/to/data")
```

**방법 2: Storage Account Access Key**
```python
spark.conf.set("fs.azure.account.key.<storage-account>.dfs.core.windows.net",
               "<storage-account-access-key>")
```

**방법 3: Managed Identity (권장)**
```python
spark.conf.set("fs.azure.account.auth.type.<storage-account>.dfs.core.windows.net", "OAuth")
spark.conf.set("fs.azure.account.oauth.provider.type.<storage-account>.dfs.core.windows.net",
               "org.apache.hadoop.fs.azurebfs.oauth2.MsiTokenProvider")
spark.conf.set("fs.azure.account.oauth2.msi.tenant.<storage-account>.dfs.core.windows.net",
               "<tenant-id>")
```

### 5. 네트워크 확인

#### DNS 해석 확인:
```python
# Databricks Notebook에서 확인
import socket
storage_fqdn = "<storage-account>.blob.core.windows.net"
ip_address = socket.gethostbyname(storage_fqdn)
print(f"{storage_fqdn} resolves to {ip_address}")
# Private IP (10.x.x.x)가 나와야 함
```

#### 연결 테스트:
```python
# Blob 접근 테스트
try:
    df = spark.read.text("wasbs://<container>@<storage-account>.blob.core.windows.net/test.txt")
    print("Connection successful!")
except Exception as e:
    print(f"Connection failed: {e}")
```

## Terraform 설정 예시

```hcl
# Storage Account
resource "azurerm_storage_account" "main" {
  name                     = "mystorageaccount"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
}

# Private Endpoint
resource "azurerm_private_endpoint" "storage" {
  name                = "pe-storage-databricks"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.private_endpoint.id

  private_service_connection {
    name                           = "pe-storage-connection"
    private_connection_resource_id = azurerm_storage_account.main.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [azurerm_private_dns_zone.blob.id]
  }
}

# Private DNS Zone
resource "azurerm_private_dns_zone" "blob" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_private_dns_zone_virtual_network_link" "blob" {
  name                  = "blob-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.blob.name
  virtual_network_id    = azurerm_virtual_network.main.id
}
```

## 트러블슈팅

### 1. 연결 실패
- Private Endpoint가 Databricks VNet과 동일한 VNet 또는 피어링된 VNet에 있는지 확인
- NSG (Network Security Group) 규칙 확인
- DNS 해석이 Private IP로 되는지 확인

### 2. DNS 문제
```bash
# DNS 확인 (Databricks Cluster에서)
nslookup <storage-account>.blob.core.windows.net
# Private IP (10.x.x.x)가 반환되어야 함
```

### 3. 권한 문제
- Storage Account에서 Databricks Service Principal 또는 Managed Identity에 적절한 RBAC 역할 할당
  - Storage Blob Data Contributor
  - Storage Blob Data Reader

## 보안 권장사항

1. **Public Access 비활성화**: Storage Account의 Public Network Access를 완전히 차단
2. **Managed Identity 사용**: Access Key 대신 Managed Identity 사용
3. **최소 권한 원칙**: 필요한 최소한의 RBAC 역할만 부여
4. **네트워크 분리**: Private Endpoint용 별도 Subnet 사용
5. **모니터링**: Azure Monitor로 Private Endpoint 연결 모니터링

## 참고 문서
- [Azure Private Link](https://docs.microsoft.com/azure/private-link/)
- [Azure Databricks VNet Injection](https://docs.microsoft.com/azure/databricks/administration-guide/cloud-configurations/azure/vnet-inject)
- [Azure Storage Private Endpoints](https://docs.microsoft.com/azure/storage/common/storage-private-endpoints)
