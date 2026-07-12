/**
 * Resolve AI - Complaints Intelligence Engine
 * This file dynamically populates your complaints.html table.
 */

const App = {
    // 1. Data Store: Stores live complaints processed by the AI
    data: [],

    init() {
        console.log("Resolve AI Engine: Online.");
        this.bindEvents();
    },

    bindEvents() {
        // Event: Search Input (Enter key triggers analysis)
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const text = e.target.value;
                    e.target.value = ''; // Clear input after triggering
                    this.processRealComplaint(text);
                }
            });
        }

        // Event: Export Button
        const exportBtn = document.getElementById('btn-export-main');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCSV());
        }
    },

    // 2. The Asynchronous Pipeline
    async processRealComplaint(text) {
        if (!text.trim()) return;

        const statusEl = document.getElementById('last-updated-text');
        statusEl.textContent = "Analyzing...";

        try {
            /** * MOCK API CALL
             * Replace this fetch with your actual backend endpoint:
             * const response = await fetch('/api/analyze', { ... });
             */
            const result = {
                id: Date.now(),
                customer_name: "Customer #" + Math.floor(Math.random() * 1000),
                summary: text.substring(0, 60) + "...",
                issue_category: "General Inquiry",
                sentiment_score: -0.2, // Mocking a negative sentiment
                urgency_level: "Medium",
                status: "pending",
                created_at: new Date().toISOString()
            };

            // Add to the front of the data array
            this.data.unshift(result);
            this.renderTable();
            statusEl.textContent = "Last update: Just now";
            
        } catch (err) {
            console.error("Pipeline Failed:", err);
            statusEl.textContent = "Analysis Error";
        }
    },

    // 3. Dynamic DOM Injection (Targets table-body)
    renderTable() {
        const tbody = document.getElementById('table-body');
        const emptyState = document.getElementById('empty-state');
        
        if (!tbody) return;

        // Hide empty state if data exists
        if (this.data.length > 0) {
            emptyState.classList.add('hidden');
        }

        tbody.innerHTML = this.data.map(item => `
            <tr>
                <td><input type="checkbox"></td>
                <td>${item.customer_name}</td>
                <td class="col-wide">${item.summary}</td>
                <td>${item.issue_category}</td>
                <td><span class="badge badge-${item.sentiment_score < 0 ? 'negative' : 'neutral'}">${item.sentiment_score < 0 ? 'Negative' : 'Neutral'}</span></td>
                <td>${item.urgency_level}</td>
                <td>General</td>
                <td><span class="badge status-${item.status}">${item.status}</span></td>
                <td>${new Date(item.created_at).toLocaleDateString()}</td>
                <td>—</td>
            </tr>
        `).join('');
    },

    // 4. CSV Export Logic
    exportCSV() {
        if (this.data.length === 0) return alert("No analyzed complaints to export.");
        
        const headers = ["Customer", "Summary", "Category", "Status", "Date"];
        const csv = [headers.join(","), ...this.data.map(i => 
            `${i.customer_name},"${i.summary.replace(/"/g, '""')}",${i.issue_category},${i.status},${i.created_at}`
        )].join("\n");

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resolve_ai_complaints.csv';
        a.click();
    }
};

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => App.init());
            
