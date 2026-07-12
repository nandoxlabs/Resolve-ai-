/**
 * Resolve AI — Complaints Intelligence
 * ==========================================================================
 * BACKEND CONTRACT (this is the spec — none of these endpoints exist in the
 * repo yet, only /api/analyze does). Build these to make this page real:
 *
 *   GET  /api/complaints
 *        -> { data: Complaint[] }
 *
 *   PATCH /api/complaints/bulk-update
 *        body: { ids: string[], patch: Partial<Complaint> }
 *        -> { data: Complaint[] }   (the updated records)
 *
 *   POST /api/complaints/bulk-delete
 *        body: { ids: string[] }
 *        -> { ok: true }
 *
 * Complaint shape mirrors exactly what /api/analyze already returns from
 * Gemini (see analyze.js), plus a few fields the app owns itself (id,
 * status, created_at). Deliberately NOT inventing fields the model doesn't
 * produce — e.g. there is no real "confidence" score in analyze.js's
 * schema today, so that column renders "—" until the schema actually
 * returns one. Faking a number there would look fine in a demo and be a
 * liability the first time an enterprise buyer asks "how is this
 * calculated?"
 *
 *   {
 *     id, created_at, status,                     // app-owned
 *     customer_name, source_channel, issue_category, issue_subcategory,
 *     sentiment_score, urgency_level, desired_resolution,
 *     legal_threat_detected, viral_risk_detected, safety_concern_detected,
 *     vip_flag, summary, recommended_action, assign_to, resolve_by_hours,
 *     draft_response, tasks, crm_note                // from analyze.js
 *     confidence?                                    // not yet produced
 *   }
 * ========================================================================== */

const CONFIG = {
  API_BASE: '/api',
  PAGE_SIZE: 20,
};

/* ==========================================================================
   TOASTS
   ========================================================================== */

const Toast = {
  container: null,
  init() { this.container = document.getElementById('toast-container'); },
  show(message, type = 'info', duration = 4000) {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .2s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }
};

/* ==========================================================================
   UTILITIES
   ========================================================================== */

const Utils = {
  escapeHTML: (str) => {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
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
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(isoString)),
  formatDateTime: (isoString) => new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(isoString)),
  timeAgo: (isoString) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  },
  uid: () => `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  sentimentBucket: (score) => (score <= -0.2 ? 'negative' : score >= 0.2 ? 'positive' : 'neutral'),
};

/* ==========================================================================
   DEMO / FALLBACK DATA
   Used only when GET /api/complaints fails (which it will, until that
   endpoint is built). Same fictional personas as the marketing demo
   (index.html), extended with a few more so the table isn't empty.
   ========================================================================== */

const DEMO_COMPLAINTS = [
  { customer_name: 'Sarah Mitchell', source_channel: 'gmail', issue_category: 'Delivery', issue_subcategory: 'Non-delivery / Late shipment', sentiment_score: -0.85, urgency_level: 'high', desired_resolution: 'Full refund of £89 express delivery charge, or full order refund', legal_threat_detected: false, viral_risk_detected: true, safety_concern_detected: false, vip_flag: false, summary: "Order #48291 has not arrived after 3 weeks despite paid express delivery, and 4 prior emails went unanswered.", recommended_action: 'Escalate to logistics for immediate tracking check and issue refund if order cannot be located within 24 hours.', assign_to: 'Logistics Team', resolve_by_hours: 4, draft_response: "Hi Sarah, I'm really sorry order #48291 still hasn't arrived...", tasks: [{ title: 'Trace order #48291 with courier', assigned_to: 'Logistics Team', priority: 'urgent', due_in_hours: 2 }], crm_note: 'Customer extremely dissatisfied over delayed order.', status: 'pending', daysAgo: 0.2 },
  { customer_name: 'James Thornton', source_channel: 'support_ticket', issue_category: 'Product Safety', issue_subcategory: 'Defective product / Injury claim', sentiment_score: -0.6, urgency_level: 'critical', desired_resolution: 'Full compensation of £1,200 within 48 hours', legal_threat_detected: true, viral_risk_detected: false, safety_concern_detected: true, vip_flag: false, summary: 'Hand injury from defective ProMax Blender (X-2200); solicitor retained, threatening county court.', recommended_action: 'Immediately escalate to legal and product safety; do not send standard refund.', assign_to: 'Safety & Compliance', resolve_by_hours: 4, draft_response: 'Dear Mr. Thornton, thank you for bringing this serious matter to our attention...', tasks: [{ title: 'Escalate injury claim to Legal team', assigned_to: 'Legal Team', priority: 'urgent', due_in_hours: 1 }], crm_note: 'Active legal threat — route to legal, no automated replies.', status: 'in_progress', daysAgo: 1.1 },
  { customer_name: 'Amanda (@AmandaFoodLover)', source_channel: 'review', issue_category: 'Product Quality', issue_subcategory: 'Damaged / late order, social media risk', sentiment_score: -0.75, urgency_level: 'critical', desired_resolution: 'Refund + goodwill gesture before further posts', legal_threat_detected: false, viral_risk_detected: true, safety_concern_detected: false, vip_flag: true, summary: 'Birthday cake arrived late and damaged; customer (180k IG followers) already posting publicly.', recommended_action: 'Senior team member to personally reach out within 2 hours.', assign_to: 'Customer Success — VIP Escalation', resolve_by_hours: 2, draft_response: "Hi Amanda, I'm so sorry — this is absolutely not the experience we want...", tasks: [{ title: 'Senior CS rep to personally contact customer', assigned_to: 'Customer Success Lead', priority: 'urgent', due_in_hours: 1 }], crm_note: 'High-follower customer already posting — treat as VIP escalation.', status: 'pending', daysAgo: 1.6 },
  { customer_name: 'Marcus James', source_channel: 'whatsapp', issue_category: 'Billing', issue_subcategory: 'Duplicate charges / overcharge', sentiment_score: -0.4, urgency_level: 'high', desired_resolution: 'Refund of £98 overcharge plus overdraft fees', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: true, summary: 'Charged three times (£147) for a £49 subscription, causing an account overdraft.', recommended_action: 'Verify subscription billing history and refund duplicate charges.', assign_to: 'Billing Team', resolve_by_hours: 6, draft_response: 'Hi Marcus, thank you for flagging this...', tasks: [{ title: 'Verify and refund 2 duplicate charges', assigned_to: 'Billing Team', priority: 'urgent', due_in_hours: 6 }], crm_note: '2-year customer triple-charged due to billing error.', status: 'resolved', daysAgo: 3.2 },
  { customer_name: 'Claire Thompson', source_channel: 'gmail', issue_category: 'Product Safety', issue_subcategory: 'Child ingestion / labeling concern', sentiment_score: -0.5, urgency_level: 'critical', desired_resolution: 'Investigation into product safety, potential recall', legal_threat_detected: false, viral_risk_detected: true, safety_concern_detected: true, vip_flag: false, summary: "6-year-old ingested 'non-toxic' paint from a craft kit; hospital monitoring advised.", recommended_action: 'Escalate to product safety for urgent investigation of labeling.', assign_to: 'Safety & Compliance', resolve_by_hours: 1, draft_response: 'Dear Ms. Thompson, thank you for letting us know...', tasks: [{ title: 'Urgent investigation of paint composition and labeling', assigned_to: 'Safety & Compliance', priority: 'urgent', due_in_hours: 1 }], crm_note: 'Child ingestion incident with hospital involvement.', status: 'in_progress', daysAgo: 0.5 },
  { customer_name: 'Priya Nair', source_channel: 'support_ticket', issue_category: 'Delivery', issue_subcategory: 'Wrong item shipped', sentiment_score: -0.3, urgency_level: 'medium', desired_resolution: 'Correct item shipped, prepaid return label for wrong item', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Received a different size/colour than ordered on order #55210.', recommended_action: 'Ship correct item and provide prepaid return label.', assign_to: 'Fulfilment Team', resolve_by_hours: 24, draft_response: 'Hi Priya, sorry about the mix-up on order #55210...', tasks: [{ title: 'Ship replacement item', assigned_to: 'Fulfilment Team', priority: 'normal', due_in_hours: 24 }], crm_note: 'Simple fulfilment error, low risk.', status: 'resolved', daysAgo: 5.4 },
  { customer_name: 'Tom Ackerman', source_channel: 'review', issue_category: 'Customer Service', issue_subcategory: 'Unresponsive support', sentiment_score: -0.55, urgency_level: 'medium', desired_resolution: 'A real response from a human', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Left 3 unanswered support tickets over 10 days about a login issue.', recommended_action: 'Route to Tier 2 support for direct follow-up.', assign_to: 'Support Team', resolve_by_hours: 12, draft_response: 'Hi Tom, apologies for the delay in getting back to you...', tasks: [{ title: 'Tier 2 follow-up on login issue', assigned_to: 'Support Team', priority: 'high', due_in_hours: 12 }], crm_note: 'Response-time complaint, not product related.', status: 'pending', daysAgo: 2.0 },
  { customer_name: 'Elena Kowalski', source_channel: 'whatsapp', issue_category: 'Billing', issue_subcategory: 'Unexpected renewal charge', sentiment_score: -0.2, urgency_level: 'low', desired_resolution: 'Clarify renewal terms, refund if within cooling-off period', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: "Was charged for auto-renewal and says it wasn't made clear at signup.", recommended_action: 'Review renewal disclosure and offer refund if within policy window.', assign_to: 'Billing Team', resolve_by_hours: 48, draft_response: 'Hi Elena, thanks for reaching out about the renewal charge...', tasks: [{ title: 'Review renewal disclosure copy', assigned_to: 'Billing Team', priority: 'normal', due_in_hours: 48 }], crm_note: 'Possible pattern — check if others report the same confusion.', status: 'pending', daysAgo: 4.1 },
  { customer_name: 'David Okafor', source_channel: 'support_ticket', issue_category: 'Product Quality', issue_subcategory: 'Item arrived damaged', sentiment_score: -0.45, urgency_level: 'medium', desired_resolution: 'Replacement or refund', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Glass item arrived cracked in transit, packaging looked insufficient.', recommended_action: 'Send replacement and flag packaging for this SKU.', assign_to: 'Fulfilment Team', resolve_by_hours: 24, draft_response: 'Hi David, sorry to hear it arrived damaged...', tasks: [{ title: 'Send replacement item', assigned_to: 'Fulfilment Team', priority: 'normal', due_in_hours: 24 }], crm_note: 'Second report this month of this SKU arriving damaged.', status: 'in_progress', daysAgo: 1.8 },
  { customer_name: 'Grace Lin', source_channel: 'review', issue_category: 'General Inquiry', issue_subcategory: 'Product question', sentiment_score: 0.1, urgency_level: 'low', desired_resolution: 'Answer about product compatibility', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Asking whether an accessory is compatible with an older model.', recommended_action: 'Reply with compatibility info from the spec sheet.', assign_to: 'Support Team', resolve_by_hours: 48, draft_response: 'Hi Grace, great question...', tasks: [{ title: 'Reply with compatibility details', assigned_to: 'Support Team', priority: 'normal', due_in_hours: 48 }], crm_note: 'Pre-sale question, not a complaint — low priority.', status: 'resolved', daysAgo: 6.3 },
  { customer_name: 'Ahmed Farouk', source_channel: 'gmail', issue_category: 'Billing', issue_subcategory: 'Refund not received', sentiment_score: -0.5, urgency_level: 'high', desired_resolution: 'Refund promised 2 weeks ago, still not received', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Refund was approved by support but never actually processed.', recommended_action: 'Escalate to billing to confirm and process the outstanding refund.', assign_to: 'Billing Team', resolve_by_hours: 8, draft_response: 'Hi Ahmed, apologies for the delay on your refund...', tasks: [{ title: 'Confirm and process outstanding refund', assigned_to: 'Billing Team', priority: 'high', due_in_hours: 8 }], crm_note: 'Refund promised but not processed — process gap.', status: 'pending', daysAgo: 0.9 },
  { customer_name: 'Nina Petrova', source_channel: 'whatsapp', issue_category: 'Delivery', issue_subcategory: 'Delayed order, no tracking update', sentiment_score: -0.35, urgency_level: 'medium', desired_resolution: 'Updated tracking info or refund', legal_threat_detected: false, viral_risk_detected: false, safety_concern_detected: false, vip_flag: false, summary: 'Tracking has shown no movement for 6 days.', recommended_action: 'Check with courier and provide updated ETA.', assign_to: 'Logistics Team', resolve_by_hours: 24, draft_response: 'Hi Nina, thanks for your patience...', tasks: [{ title: 'Check courier status', assigned_to: 'Logistics Team', priority: 'normal', due_in_hours: 12 }], crm_note: 'Likely a courier network delay, not company-caused.', status: 'in_progress', daysAgo: 2.7 },
];

function buildDemoDataset() {
  const now = Date.now();
  return DEMO_COMPLAINTS.map((c) => ({
    id: Utils.uid(),
    created_at: new Date(now - c.daysAgo * 86400000).toISOString(),
    confidence: undefined, // honest: analyze.js's schema doesn't produce this today
    ...c,
  }));
}

/* ==========================================================================
   API SERVICE
   ========================================================================== */

const ApiService = {
  async listComplaints() {
    try {
      const res = await fetch(`${CONFIG.API_BASE}/complaints`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      if (!payload || !Array.isArray(payload.data)) throw new Error('Unexpected response shape');
      return { items: payload.data, usingFallback: false };
    } catch (err) {
      console.warn('[ResolveAI] GET /api/complaints unavailable — using local demo data.', err.message);
      return { items: buildDemoDataset(), usingFallback: true };
    }
  },

  async bulkUpdate(ids, patch) {
    const res = await fetch(`${CONFIG.API_BASE}/complaints/bulk-update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, patch }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async bulkDelete(ids) {
    const res = await fetch(`${CONFIG.API_BASE}/complaints/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
};

/* ==========================================================================
   STORE
   ========================================================================== */

const Store = {
  all: [],
  filtered: [],
  page: 1,
  selectedIds: new Set(),
  usingFallback: false,
  filters: { search: '', priority: '', sentiment: '', department: '', status: '', sort: 'date_desc' },
};

/* ==========================================================================
   UI CONTROLLER
   ========================================================================== */

const UI = {
  el: {},

  init() {
    this.el = {
      tableBody: document.getElementById('table-body'),
      statsContainer: document.getElementById('stats-container'),
      emptyState: document.getElementById('empty-state'),
      table: document.getElementById('complaints-table'),
      lastUpdated: document.getElementById('last-updated-text'),
      search: document.getElementById('global-search'),
      filterPriority: document.getElementById('filter-priority'),
      filterSentiment: document.getElementById('filter-sentiment'),
      filterDepartment: document.getElementById('filter-department'),
      filterStatus: document.getElementById('filter-status'),
      sortBy: document.getElementById('sort-by'),
      selectAll: document.getElementById('select-all'),
      bulkToolbar: document.getElementById('bulk-actions-toolbar'),
      bulkCount: document.getElementById('bulk-count-text'),
      paginationInfo: document.getElementById('pagination-info'),
      currentPageText: document.getElementById('current-page-text'),
      btnPrev: document.getElementById('btn-prev-page'),
      btnNext: document.getElementById('btn-next-page'),
      btnRefresh: document.getElementById('btn-refresh'),
      btnExportMain: document.getElementById('btn-export-main'),
      drawer: document.getElementById('complaint-drawer'),
      drawerContent: document.getElementById('drawer-content'),
      drawerBackdrop: document.getElementById('drawer-backdrop'),
      btnCloseDrawer: document.getElementById('btn-close-drawer'),
      mainContent: document.querySelector('.main-content'),
    };

    this.el.search.addEventListener('input', Utils.debounce(() => {
      Store.filters.search = this.el.search.value.trim().toLowerCase();
      Store.selectedIds.clear();
      App.applyFiltersAndRender();
    }, 250));

    [['filterPriority', 'priority'], ['filterSentiment', 'sentiment'], ['filterDepartment', 'department'], ['filterStatus', 'status']]
      .forEach(([elKey, filterKey]) => {
        this.el[elKey].addEventListener('change', () => {
          Store.filters[filterKey] = this.el[elKey].value;
          Store.selectedIds.clear();
          App.applyFiltersAndRender();
        });
      });

    this.el.sortBy.addEventListener('change', () => {
      Store.filters.sort = this.el.sortBy.value;
      App.applyFiltersAndRender();
    });

    this.el.selectAll.addEventListener('change', () => App.toggleSelectAllOnPage());
    this.el.btnPrev.addEventListener('click', () => App.goToPage(Store.page - 1));
    this.el.btnNext.addEventListener('click', () => App.goToPage(Store.page + 1));
    this.el.btnRefresh.addEventListener('click', () => App.loadData(true));
    this.el.btnExportMain.addEventListener('click', () => App.exportToC
