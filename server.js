const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// PowerShell 명령 실행 헬퍼 함수
async function executePowerShell(command) {
  try {
    const { stdout, stderr } = await execPromise(`powershell.exe -Command "${command}"`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    if (stderr && !stderr.includes('WARNING')) {
      console.error('PowerShell stderr:', stderr);
    }

    return { success: true, data: stdout, error: null };
  } catch (error) {
    console.error('PowerShell execution error:', error);
    return { success: false, data: null, error: error.message };
  }
}

// API Routes

// 구독 목록 조회
app.get('/api/subscriptions', async (req, res) => {
  try {
    const command = `
      Get-AzSubscription | Select-Object Name, Id, State | ConvertTo-Json
    `;

    const result = await executePowerShell(command);

    if (result.success) {
      const subscriptions = JSON.parse(result.data || '[]');
      res.json({ success: true, data: Array.isArray(subscriptions) ? subscriptions : [subscriptions] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 리소스 그룹 조회
app.get('/api/resource-groups', async (req, res) => {
  try {
    const { subscriptionId } = req.query;

    let command = `Get-AzResourceGroup | Select-Object ResourceGroupName, Location | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      const resourceGroups = JSON.parse(result.data || '[]');
      res.json({ success: true, data: Array.isArray(resourceGroups) ? resourceGroups : [resourceGroups] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AKS 클러스터 조회
app.get('/api/aks-clusters', async (req, res) => {
  try {
    const { subscriptionId, resourceGroup } = req.query;

    let command = `Get-AzAksCluster`;

    if (resourceGroup) {
      command += ` -ResourceGroupName "${resourceGroup}"`;
    }

    command += ` | Select-Object Name, ResourceGroupName, Location, KubernetesVersion, NodeResourceGroup, ProvisioningState | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      const clusters = JSON.parse(result.data || '[]');
      res.json({ success: true, data: Array.isArray(clusters) ? clusters : [clusters] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// VM 스케일 세트 조회 (AKS 노드 풀)
app.get('/api/vmss', async (req, res) => {
  try {
    const { subscriptionId, resourceGroup } = req.query;

    let command = `Get-AzVmss`;

    if (resourceGroup) {
      command += ` -ResourceGroupName "${resourceGroup}"`;
    }

    command += ` | Select-Object Name, ResourceGroupName, Location, Sku, @{Name='Capacity';Expression={$_.Sku.Capacity}} | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      const vmss = JSON.parse(result.data || '[]');
      res.json({ success: true, data: Array.isArray(vmss) ? vmss : [vmss] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 스케줄 조회 (Azure Automation Account 사용)
app.get('/api/schedules', async (req, res) => {
  try {
    const { subscriptionId, resourceGroup, automationAccount } = req.query;

    if (!resourceGroup || !automationAccount) {
      return res.status(400).json({
        success: false,
        error: 'resourceGroup and automationAccount are required'
      });
    }

    let command = `Get-AzAutomationSchedule -ResourceGroupName "${resourceGroup}" -AutomationAccountName "${automationAccount}" | Select-Object Name, Description, StartTime, ExpiryTime, Interval, Frequency, IsEnabled, TimeZone | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      const schedules = result.data.trim() ? JSON.parse(result.data) : [];
      res.json({ success: true, data: Array.isArray(schedules) ? schedules : [schedules] });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 스케줄 생성
app.post('/api/schedules', async (req, res) => {
  try {
    const {
      subscriptionId,
      resourceGroup,
      automationAccount,
      scheduleName,
      startTime,
      description,
      frequency,
      interval,
      timeZone
    } = req.body;

    if (!resourceGroup || !automationAccount || !scheduleName || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    let command = `New-AzAutomationSchedule -ResourceGroupName "${resourceGroup}" -AutomationAccountName "${automationAccount}" -Name "${scheduleName}" -StartTime "${startTime}" -Frequency "${frequency || 'OneTime'}"`;

    if (description) {
      command += ` -Description "${description}"`;
    }

    if (interval) {
      command += ` -Interval ${interval}`;
    }

    if (timeZone) {
      command += ` -TimeZone "${timeZone}"`;
    }

    command += ` | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      const schedule = result.data.trim() ? JSON.parse(result.data) : {};
      res.json({ success: true, data: schedule });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 스케줄 업데이트
app.put('/api/schedules/:scheduleName', async (req, res) => {
  try {
    const { scheduleName } = req.params;
    const {
      subscriptionId,
      resourceGroup,
      automationAccount,
      isEnabled,
      description
    } = req.body;

    if (!resourceGroup || !automationAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    let command = `Set-AzAutomationSchedule -ResourceGroupName "${resourceGroup}" -AutomationAccountName "${automationAccount}" -Name "${scheduleName}"`;

    if (typeof isEnabled !== 'undefined') {
      command += ` -IsEnabled $${isEnabled}`;
    }

    if (description) {
      command += ` -Description "${description}"`;
    }

    command += ` | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      res.json({ success: true, message: 'Schedule updated successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 스케줄 삭제
app.delete('/api/schedules/:scheduleName', async (req, res) => {
  try {
    const { scheduleName } = req.params;
    const { subscriptionId, resourceGroup, automationAccount } = req.query;

    if (!resourceGroup || !automationAccount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    let command = `Remove-AzAutomationSchedule -ResourceGroupName "${resourceGroup}" -AutomationAccountName "${automationAccount}" -Name "${scheduleName}" -Force`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      res.json({ success: true, message: 'Schedule deleted successfully' });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// VMSS 스케일 조정 (즉시 실행)
app.post('/api/vmss/scale', async (req, res) => {
  try {
    const { subscriptionId, resourceGroup, vmssName, capacity } = req.body;

    if (!resourceGroup || !vmssName || capacity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    let command = `Update-AzVmss -ResourceGroupName "${resourceGroup}" -VMScaleSetName "${vmssName}" -SkuCapacity ${capacity} | ConvertTo-Json`;

    if (subscriptionId) {
      command = `Set-AzContext -SubscriptionId "${subscriptionId}"; ${command}`;
    }

    const result = await executePowerShell(command);

    if (result.success) {
      res.json({ success: true, message: `VMSS ${vmssName} scaled to ${capacity} instances` });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 현재 Azure 컨텍스트 확인
app.get('/api/current-context', async (req, res) => {
  try {
    const command = `Get-AzContext | Select-Object Name, Account, Subscription | ConvertTo-Json`;
    const result = await executePowerShell(command);

    if (result.success) {
      const context = result.data.trim() ? JSON.parse(result.data) : null;
      res.json({ success: true, data: context });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`AKS VM Schedule Manager server is running on http://localhost:${PORT}`);
  console.log(`Open your browser and navigate to http://localhost:${PORT}`);
});
