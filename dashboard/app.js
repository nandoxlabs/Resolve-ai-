/**
 * Resolve AI - Complaints Intelligence Workspace
 * Master Orchestrator: Handles the complete end-to-end workflow
 */

// --- 1. UTILITIES ---
const Utils = {
    escapeHTML: (str) => {
        const div = document.createElement('div');
        div.textContent = String(str || '');
        return div.innerHTML;
    },
    debounce: (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },
    formatDate: (isoString) => new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(isoString))
};

// --- 2. API & MOCK SERVICE ---
const ApiService = {
    async request(endpoint, options = {}) {
        // Simulates the backend flow: Upload -> Processing -> AI Analysis
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    meta: { total: 150, page: 1, limit: 50 },
                    stats: { total: 150, critical: 12, resolved: 85, pending: 65, topCategory: "Billing" },
                    data: Array.from({length: 20}, (_, i) => ({
                        id: `CMP-${1000 + i}`,
                        customer: `Client ${i + 1}`,
                        originalText: "I am frustrated with the billing double charge.",
                        aiSummary: "Duplicate charge detected in billing cycle.",
                        category: "Billing",
                        sentiment: "negative",
                        priority: i % 4 === 0 ? "critical" : "medium",
                        status: "pending",
                        date: new Date().toISOString(),
                        confidence: 0.98,
                        rootCause: "Webhook sync error",
                        suggestedAction: "Issue partial refund"
                    }))
                });
            }, 800);
        });
    }
};

// --- 3. STATE MANAGEMENT ---
const Store = {
    data: [],
    selectedIds: new Set(),
    filters: { search: '', priority: '', status: '' }
};

// --- 4. UI CONTROLLER (Handles Views & Interactions) ---
const UI = {
    elements: {
        tableBody: document.getElementById('table-body'),
        uploadZone: document.getElementById('upload-zone'),
        drawer: document.getElementById('complaint-drawer'),
        drawerContent: document.getElementById('drawer-content')
    },

    init() {
        // Drag & Drop Listeners
        this.elements.uploadZone?.addEventListener('drop', (e) => this.handleDrop(e));
        this.elements.uploadZone?.addEventListener('dragover', (e) => e.preventDefault());
    },

    renderTable(data) {
        if (!this.elements.tableBody) return;
        this.elements.tableBody.innerHTML = data.map(row => `
            <tr onclick="UI.openDrawer('${row.id}')" class="cursor-pointer hover:bg-slate-50">
                <td>${row.id}</td>
                <td>${row.customer}</td>
                <td class="text-sm">${row.aiSummary}</td>
                <td><span class="badge">${row.priority}</span></td>
                <td>${row.status}</td>
            </tr>
        `).join('');
    },

    openDrawer(id) {
        const record = Store.data.find(d => d.id === id);
        if (!record) return;

        this.elements.drawerContent.innerHTML = `
            <h3 class="text-lg font-bold">${record.id}</h3>
            <div class="mt-4 p-4 bg-slate-50 rounded">
                <p><strong>AI Summary:</strong> ${record.aiSummary}</p>
                <p class="mt-2"><strong>Root Cause:</strong> ${record.rootCause}</p>
            </div>
            <button onclick="App.executeAction('${record.id}')" class="btn btn-primary w-full mt-4">
                Execute Suggested Action
            </button>
        `;
        document.getElementById('complaint-drawer').classList.add('open');
    },

    handleDrop(e) {
        e.preventDefault();
        UI.showToast("File uploaded! Processing AI analysis...", "info");
        App.processUpload();
    },

    showToast(msg, type) {
        console.log(`[${type.toUpperCase()}] ${msg}`);
    }
};

// --- 5. APPLICATION CORE (Orchestration) ---
const App = {
    async init() {
        UI.init();
        await this.loadData();
    },

    async loadData() {
        const res = await ApiService.request('/complaints');
        Store.data = res.data;
        UI.renderTable(Store.data);
    },

    async processUpload() {
        // Orchestrates the workflow: Upload -> Analysis -> Refresh
        await new Promise(r => setTimeout(r, 2000));
        await this.loadData();
        UI.showToast("Analysis complete. Complaints ready.", "success");
    },

    async executeAction(id) {
        UI.showToast(`Executing action for ${id}...`, "success");
        // Logic to update status...
        await this.loadData();
        document.getElementById('complaint-drawer').classList.remove('open');
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
