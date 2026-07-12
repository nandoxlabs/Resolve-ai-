/**
 * Resolve AI - Master Orchestrator
 * Merges high-performance UI state management with real-time AI processing.
 */

const App = {
    // 1. Unified State
    data: [], // Stores real complaints
    filters: { search: '', priority: '', sentiment: '', department: '', status: '' },

    init() {
        console.log("Resolve AI Engine Initialized.");
        this.bindEvents();
        this.loadData();
    },

    bindEvents() {
        // Search Input triggers real-time analysis on 'Enter'
        document.getElementById('global-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.processRealComplaint(e.target.value);
        });

        // Export Trigger
        document.getElementById('btn-export-main').addEventListener('click', () => this.exportCSV());
    },

    // 2. Real-Time Processing Pipeline
    async processRealComplaint(text) {
        if (!text.trim()) return;

        // UI Feedback
        const statusText = document.getElementById('last-updated-text');
        statusText.textContent = "Analyzing with AI...";

        try {
            // Replace this with your actual API endpoint to Gemini/OpenAI
            // const res = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify({ text }) });
            // const result = await res.json();
            
            // Mocking dynamic response based on input
            const newComplaint = {
                id: Date.now(),
                customer: "New Customer",
                summary: text.substring(0, 60) + "...",
                category: "General",
                sentiment: text.toLowerCase().includes('bad') ? 'negative' : 'neutral',
                priority: 'medium',
                status: 'pending',
                date: new Date().toLocaleDateString(),
                confidence: "98%"
            };

            this.data.unshift(newComplaint); // Add to top
            this.renderTable();
            statusText.textContent = "Updated just now";
        } catch (err) {
            console.error("Pipeline Error:", err);
            statusText.textContent = "Analysis failed.";
        }
    },

    // 3. Dynamic UI Rendering
    renderTable() {
        const tbody = document.getElementById('table-body');
        if (!tbody) return;

        tbody.innerHTML = this.data.map(item => `
            <tr onclick="App.openDrawer('${item.id}')">
                <td><input type="checkbox"></td>
                <td>${item.customer}</td>
                <td>${item.summary}</td>
                <td>${item.category}</td>
                <td><span class="badge badge-${item.sentiment}">${item.sentiment}</span></td>
                <td><span class="badge badge-priority">${item.priority}</span></td>
                <td>${item.status}</td>
                <td>
                    <button class="btn-sm" onclick="event.stopPropagation(); App.markAsSolved('${item.id}')">
                        ${item.status === 'resolved' ? '✅' : 'Mark Solved'}
                    </button>
                </td>
                <td>${item.date}</td>
            </tr>
        `).join('');
    },

    markAsSolved(id) {
        const complaint = this.data.find(c => c.id == id);
        if (complaint) {
            complaint.status = 'resolved';
            this.renderTable();
        }
    },

    exportCSV() {
        if (this.data.length === 0) return alert("No data to export.");
        
        const headers = ["ID", "Customer", "Summary", "Status", "Date"];
        const csvContent = [headers.join(","), ...this.data.map(i => 
            `${i.id},${i.customer},"${i.summary.replace(/"/g, '""')}",${i.status},${i.date}`
        )].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resolve_ai_report.csv';
        a.click();
    },

    // Mock initial load
    loadData() {
        // Here you would fetch from your GET /api/complaints endpoint
        this.renderTable();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
      
