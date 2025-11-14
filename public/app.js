// Global state
const state = {
    currentSubscription: null,
    currentResourceGroup: null,
    currentAutomationAccount: null,
    subscriptions: [],
    resourceGroups: [],
    aksClusters: [],
    vmssList: [],
    schedules: []
};

// API Base URL
const API_BASE = '';

// DOM Elements
let elements = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    attachEventListeners();
    loadCurrentContext();
});

function initializeElements() {
    elements = {
        subscription: document.getElementById('subscription'),
        resourceGroup: document.getElementById('resource-group'),
        automationAccount: document.getElementById('automation-account'),
        loadResourcesBtn: document.getElementById('load-resources-btn'),
        aksClusters: document.getElementById('aks-clusters'),
        vmssList: document.getElementById('vmss-list'),
        schedulesContainer: document.getElementById('schedules-container'),
        addScheduleBtn: document.getElementById('add-schedule-btn'),
        vmssSelect: document.getElementById('vmss-select'),
        capacity: document.getElementById('capacity'),
        scaleBtn: document.getElementById('scale-btn'),
        modal: document.getElementById('schedule-modal'),
        modalTitle: document.getElementById('modal-title'),
        scheduleForm: document.getElementById('schedule-form'),
        currentContext: document.getElementById('current-context'),
        toast: document.getElementById('toast')
    };
}

function attachEventListeners() {
    // Resource loading
    elements.subscription.addEventListener('change', onSubscriptionChange);
    elements.resourceGroup.addEventListener('change', onResourceGroupChange);
    elements.loadResourcesBtn.addEventListener('change', loadAllResources);

    // Schedule management
    elements.addScheduleBtn.addEventListener('click', () => openScheduleModal());
    elements.scheduleForm.addEventListener('submit', handleScheduleSubmit);

    // VMSS scaling
    elements.scaleBtn.addEventListener('click', handleVmssScale);

    // Modal
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.querySelector('.cancel-btn');

    closeBtn.addEventListener('click', closeScheduleModal);
    cancelBtn.addEventListener('click', closeScheduleModal);

    window.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            closeScheduleModal();
        }
    });
}

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'API 요청 실패');
        }

        return data.data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Load current Azure context
async function loadCurrentContext() {
    try {
        const context = await apiCall('/api/current-context');

        if (context && context.Account) {
            elements.currentContext.innerHTML = `
                <strong>연결됨:</strong> ${context.Account.Id || context.Account}
                (구독: ${context.Subscription.Name || context.Subscription.Id || 'N/A'})
            `;
            loadSubscriptions();
        } else {
            elements.currentContext.innerHTML = '<span class="error">Azure에 연결되지 않음</span>';
        }
    } catch (error) {
        elements.currentContext.innerHTML = '<span class="error">연결 상태 확인 실패</span>';
    }
}

// Load subscriptions
async function loadSubscriptions() {
    try {
        const subscriptions = await apiCall('/api/subscriptions');
        state.subscriptions = subscriptions;

        elements.subscription.innerHTML = '<option value="">구독 선택...</option>';
        subscriptions.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.Id;
            option.textContent = sub.Name;
            elements.subscription.appendChild(option);
        });
    } catch (error) {
        console.error('구독 로드 실패:', error);
    }
}

// Event handlers
async function onSubscriptionChange() {
    const subscriptionId = elements.subscription.value;
    state.currentSubscription = subscriptionId;

    if (!subscriptionId) {
        elements.resourceGroup.innerHTML = '<option value="">리소스 그룹 선택...</option>';
        return;
    }

    try {
        const resourceGroups = await apiCall(`/api/resource-groups?subscriptionId=${subscriptionId}`);
        state.resourceGroups = resourceGroups;

        elements.resourceGroup.innerHTML = '<option value="">리소스 그룹 선택...</option>';
        resourceGroups.forEach(rg => {
            const option = document.createElement('option');
            option.value = rg.ResourceGroupName;
            option.textContent = rg.ResourceGroupName;
            elements.resourceGroup.appendChild(option);
        });
    } catch (error) {
        console.error('리소스 그룹 로드 실패:', error);
    }
}

function onResourceGroupChange() {
    state.currentResourceGroup = elements.resourceGroup.value;
}

async function loadAllResources() {
    const subscriptionId = state.currentSubscription;
    const resourceGroup = state.currentResourceGroup;
    const automationAccount = elements.automationAccount.value.trim();

    if (!resourceGroup) {
        showToast('리소스 그룹을 선택하세요', 'warning');
        return;
    }

    state.currentAutomationAccount = automationAccount;

    // Load AKS clusters
    await loadAksClusters(subscriptionId, resourceGroup);

    // Load VMSS
    await loadVmss(subscriptionId, resourceGroup);

    // Load schedules if automation account is provided
    if (automationAccount) {
        await loadSchedules(subscriptionId, resourceGroup, automationAccount);
    }

    showToast('리소스 로드 완료', 'success');
}

async function loadAksClusters(subscriptionId, resourceGroup) {
    try {
        const clusters = await apiCall(`/api/aks-clusters?subscriptionId=${subscriptionId}&resourceGroup=${resourceGroup}`);
        state.aksClusters = Array.isArray(clusters) ? clusters : [clusters];

        if (state.aksClusters.length === 0 || !state.aksClusters[0]) {
            elements.aksClusters.innerHTML = '<p class="placeholder">AKS 클러스터가 없습니다</p>';
            return;
        }

        elements.aksClusters.innerHTML = state.aksClusters.map(cluster => `
            <div class="resource-item">
                <h4>${cluster.Name}</h4>
                <p><strong>위치:</strong> ${cluster.Location}</p>
                <p><strong>K8s 버전:</strong> ${cluster.KubernetesVersion}</p>
                <p><strong>상태:</strong> ${cluster.ProvisioningState}</p>
            </div>
        `).join('');
    } catch (error) {
        elements.aksClusters.innerHTML = '<p class="placeholder">AKS 클러스터 로드 실패</p>';
    }
}

async function loadVmss(subscriptionId, resourceGroup) {
    try {
        const vmssList = await apiCall(`/api/vmss?subscriptionId=${subscriptionId}&resourceGroup=${resourceGroup}`);
        state.vmssList = Array.isArray(vmssList) ? vmssList : [vmssList];

        if (state.vmssList.length === 0 || !state.vmssList[0]) {
            elements.vmssList.innerHTML = '<p class="placeholder">VMSS가 없습니다</p>';
            elements.vmssSelect.innerHTML = '<option value="">VMSS 선택...</option>';
            return;
        }

        elements.vmssList.innerHTML = state.vmssList.map(vmss => `
            <div class="resource-item">
                <h4>${vmss.Name}</h4>
                <p><strong>위치:</strong> ${vmss.Location}</p>
                <p><strong>용량:</strong> ${vmss.Capacity || vmss.Sku?.Capacity || 'N/A'}</p>
            </div>
        `).join('');

        // Update VMSS selector
        elements.vmssSelect.innerHTML = '<option value="">VMSS 선택...</option>';
        state.vmssList.forEach(vmss => {
            const option = document.createElement('option');
            option.value = vmss.Name;
            option.textContent = `${vmss.Name} (현재: ${vmss.Capacity || vmss.Sku?.Capacity || 0})`;
            elements.vmssSelect.appendChild(option);
        });
    } catch (error) {
        elements.vmssList.innerHTML = '<p class="placeholder">VMSS 로드 실패</p>';
    }
}

async function loadSchedules(subscriptionId, resourceGroup, automationAccount) {
    try {
        const schedules = await apiCall(`/api/schedules?subscriptionId=${subscriptionId}&resourceGroup=${resourceGroup}&automationAccount=${automationAccount}`);
        state.schedules = Array.isArray(schedules) ? schedules : (schedules ? [schedules] : []);

        if (state.schedules.length === 0) {
            elements.schedulesContainer.innerHTML = '<p class="placeholder">스케줄이 없습니다. 새 스케줄을 추가하세요.</p>';
            return;
        }

        elements.schedulesContainer.innerHTML = state.schedules.map(schedule => `
            <div class="schedule-card">
                <div class="schedule-header">
                    <div>
                        <div class="schedule-title">${schedule.Name}</div>
                        <span class="schedule-status ${schedule.IsEnabled ? 'status-enabled' : 'status-disabled'}">
                            ${schedule.IsEnabled ? '활성화' : '비활성화'}
                        </span>
                    </div>
                </div>
                ${schedule.Description ? `<p style="margin: 10px 0; font-size: 14px; color: #605e5c;">${schedule.Description}</p>` : ''}
                <div class="schedule-details">
                    <div class="schedule-detail-item">
                        <span class="schedule-detail-label">시작 시간</span>
                        <span class="schedule-detail-value">${formatDate(schedule.StartTime)}</span>
                    </div>
                    <div class="schedule-detail-item">
                        <span class="schedule-detail-label">빈도</span>
                        <span class="schedule-detail-value">${schedule.Frequency}${schedule.Interval ? ` (${schedule.Interval})` : ''}</span>
                    </div>
                    ${schedule.TimeZone ? `
                    <div class="schedule-detail-item">
                        <span class="schedule-detail-label">시간대</span>
                        <span class="schedule-detail-value">${schedule.TimeZone}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-sm ${schedule.IsEnabled ? 'btn-warning' : 'btn-success'}"
                            onclick="toggleSchedule('${schedule.Name}', ${!schedule.IsEnabled})">
                        ${schedule.IsEnabled ? '비활성화' : '활성화'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule.Name}')">
                        삭제
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        elements.schedulesContainer.innerHTML = '<p class="placeholder">스케줄 로드 실패</p>';
    }
}

// Schedule management
function openScheduleModal(schedule = null) {
    if (!state.currentAutomationAccount) {
        showToast('Automation Account를 입력하세요', 'warning');
        return;
    }

    elements.modalTitle.textContent = schedule ? '스케줄 편집' : '새 스케줄 추가';
    elements.scheduleForm.reset();

    if (schedule) {
        document.getElementById('schedule-name').value = schedule.Name;
        document.getElementById('schedule-description').value = schedule.Description || '';
        document.getElementById('start-time').value = schedule.StartTime;
        document.getElementById('frequency').value = schedule.Frequency;
        document.getElementById('interval').value = schedule.Interval || '';
        document.getElementById('timezone').value = schedule.TimeZone || 'Asia/Seoul';
    } else {
        // Set default start time to current time + 1 hour
        const defaultTime = new Date();
        defaultTime.setHours(defaultTime.getHours() + 1);
        document.getElementById('start-time').value = defaultTime.toISOString().slice(0, 16);
        document.getElementById('timezone').value = 'Asia/Seoul';
    }

    elements.modal.classList.add('show');
}

function closeScheduleModal() {
    elements.modal.classList.remove('show');
    elements.scheduleForm.reset();
}

async function handleScheduleSubmit(e) {
    e.preventDefault();

    const scheduleData = {
        subscriptionId: state.currentSubscription,
        resourceGroup: state.currentResourceGroup,
        automationAccount: state.currentAutomationAccount,
        scheduleName: document.getElementById('schedule-name').value,
        description: document.getElementById('schedule-description').value,
        startTime: document.getElementById('start-time').value,
        frequency: document.getElementById('frequency').value,
        interval: document.getElementById('interval').value || null,
        timeZone: document.getElementById('timezone').value
    };

    try {
        await apiCall('/api/schedules', {
            method: 'POST',
            body: JSON.stringify(scheduleData)
        });

        showToast('스케줄이 생성되었습니다', 'success');
        closeScheduleModal();
        await loadSchedules(state.currentSubscription, state.currentResourceGroup, state.currentAutomationAccount);
    } catch (error) {
        console.error('스케줄 생성 실패:', error);
    }
}

async function toggleSchedule(scheduleName, isEnabled) {
    if (!confirm(`스케줄을 ${isEnabled ? '활성화' : '비활성화'}하시겠습니까?`)) {
        return;
    }

    try {
        await apiCall(`/api/schedules/${scheduleName}`, {
            method: 'PUT',
            body: JSON.stringify({
                subscriptionId: state.currentSubscription,
                resourceGroup: state.currentResourceGroup,
                automationAccount: state.currentAutomationAccount,
                isEnabled: isEnabled
            })
        });

        showToast(`스케줄이 ${isEnabled ? '활성화' : '비활성화'}되었습니다`, 'success');
        await loadSchedules(state.currentSubscription, state.currentResourceGroup, state.currentAutomationAccount);
    } catch (error) {
        console.error('스케줄 업데이트 실패:', error);
    }
}

async function deleteSchedule(scheduleName) {
    if (!confirm(`'${scheduleName}' 스케줄을 삭제하시겠습니까?`)) {
        return;
    }

    try {
        await apiCall(`/api/schedules/${scheduleName}?subscriptionId=${state.currentSubscription}&resourceGroup=${state.currentResourceGroup}&automationAccount=${state.currentAutomationAccount}`, {
            method: 'DELETE'
        });

        showToast('스케줄이 삭제되었습니다', 'success');
        await loadSchedules(state.currentSubscription, state.currentResourceGroup, state.currentAutomationAccount);
    } catch (error) {
        console.error('스케줄 삭제 실패:', error);
    }
}

// VMSS scaling
async function handleVmssScale() {
    const vmssName = elements.vmssSelect.value;
    const capacity = parseInt(elements.capacity.value);

    if (!vmssName) {
        showToast('VMSS를 선택하세요', 'warning');
        return;
    }

    if (isNaN(capacity) || capacity < 0) {
        showToast('올바른 인스턴스 수를 입력하세요', 'warning');
        return;
    }

    if (!confirm(`${vmssName}을(를) ${capacity}개 인스턴스로 조정하시겠습니까?`)) {
        return;
    }

    try {
        await apiCall('/api/vmss/scale', {
            method: 'POST',
            body: JSON.stringify({
                subscriptionId: state.currentSubscription,
                resourceGroup: state.currentResourceGroup,
                vmssName: vmssName,
                capacity: capacity
            })
        });

        showToast(`VMSS 스케일 조정 시작: ${capacity}개 인스턴스`, 'success');

        // Reload VMSS list after a delay
        setTimeout(() => {
            loadVmss(state.currentSubscription, state.currentResourceGroup);
        }, 3000);
    } catch (error) {
        console.error('VMSS 스케일 조정 실패:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = `toast ${type} show`;

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}
