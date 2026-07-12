/**
 * Resolve AI - Enterprise Dashboard Master Controller
 * Combines dynamic UI updates with scalable, professional architecture.
 */

// --- 1. STATE MANAGEMENT ---
// Holds the central "truth" of our dashboard numbers
const Store = {
    metrics: { 
        total: 8, 
        open: 7, 
        resolved: 1, 
        critical: 3, 
        confidence: 86, 
        sentiment: "negative" 
    }
};

// --- 2. AI ENGINE (Mock Service) ---
// Handles the "thinking" independently of the UI
const AI_Service = {
    analyzeText(text) {
        return new Promise(resolve => {
            setTimeout(() => {
                const lowerText = text.toLowerCase();
                // Flag as critical if it contains high-risk keywords
                const isCritical = ['refund', 'sue', 'unacceptable', 'lawyer', 'worst'].some(kw => lowerText.includes(kw));
                
                resolve({
                    isCritical,
                    sentiment: isCritical ? "highly negative" : "neutral/negative",
                    confidence: isCritical ? 96 : 89
                });
            }, 1500); // 1.5s simulation delay
        });
    }
};

// --- 3. UI CONTROLLER ---
// Strictly handles grabbing elements and updating the screen
const UI = {
    elements: {
        analyzeBtn: document.getElementById('btn-analyze'),
        inputBox: document.getElementById('complaint-input'),
        refreshBtn: document.getElementById('btn-refresh'),
        dropZone: document.querySelector('.upload-dropzone'),
        // Stat Cards
        stats: {
            total: document.getElementById('stat-total'),
            open: document.getElementById('stat-open'),
            resolved: document.getElementById('stat-resolved'),
            critical: document.getElementById('stat-critical'),
            conf: document.getElementById('stat-conf'),
            sentiment: document.getElementById('stat-sentiment')
        }
    },

    updateDashboard(metrics) {
        // Safely update all numbers on the screen based on the Store
        if (this.elements.stats.total) this.elements.stats.total.textContent = metrics.total;
        if (this.elements.stats.open) this.elements.stats.open.textContent = metrics.open;
        if (this.elements.stats.resolved) this.elements.stats.resolved.textContent = metrics.resolved;
        if (this.elements.stats.critical) this.elements.stats.critical.textContent = metrics.critical;
        if (this.elements.stats.conf) this.elements.stats.conf.textContent = metrics.confidence + "%";
        if (this.elements.stats.sentiment) this.elements.stats.sentiment.textContent = metrics.sentiment;
    },

    setLoadingState(isLoading) {
        if (!this.elements.analyzeBtn) return;
        this.elements.analyzeBtn.textContent = isLoading ? "Analyzing... (Running Models)" : "Analyze with AI";
        this.elements.analyzeBtn.disabled = isLoading;
        this.elements.analyzeBtn.style.opacity = isLoading ? "0.7" : "1";
    },

    showNotification(message) {
        // Replaces the basic alert with a cleaner visual prompt
        alert(`✨ ${message}`);
    }
};

// --- 4. MASTER APP ORCHESTRATOR ---
// Connects the UI, Store, and AI Service together
const App = {
    init() {
        this.bindEvents();
        UI.updateDashboard(Store.metrics); // Load initial numbers
    },

    bindEvents() {
        // Text Area Analysis
        if (UI.elements.analyzeBtn) {
            UI.elements.analyzeBtn.addEventListener('click', () => this.processSingleComplaint());
        }
        
        // Refresh Button
        if (UI.elements.refreshBtn) {
            UI.elements.refreshBtn.addEventListener('click', () => this.resetWorkspace());
        }

        // Drag & Drop File Upload Zone
        if (UI.elements.dropZone) {
            UI.elements.dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                UI.elements.dropZone.style.borderColor = "#6366f1"; // Highlight on hover
            });
            UI.elements.dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                UI.elements.dropZone.style.borderColor = "var(--slate-300)"; // Remove highlight
            });
            UI.elements.dropZone.addEventListener('drop', (e) => this.processFileUpload(e));
        }
    },

    async processSingleComplaint() {
        const text = UI.elements.inputBox?.value.trim();
        if (!text) {
            alert("Please paste a complaint first!");
            return;
        }

        UI.setLoadingState(true);
        
        // Wait for AI to finish analyzing
        const analysis = await AI_Service.analyzeText(text);
        
        // Update our central Store
        Store.metrics.total++;
        Store.metrics.open++;
        if (analysis.isCritical) Store.metrics.critical++;
        Store.metrics.sentiment = analysis.sentiment;
        Store.metrics.confidence = analysis.confidence;

        // Push updates to the screen
        UI.updateDashboard(Store.metrics);
        UI.elements.inputBox.value = ""; // Clear the box
        UI.setLoadingState(false);
        UI.showNotification("AI Analysis Complete! Dashboard metrics updated.");
    },

    processFileUpload(e) {
        e.preventDefault();
        UI.elements.dropZone.style.borderColor = "var(--slate-300)";
        UI.showNotification("File uploaded! Processing batch analysis...");
        
        // Simulate a bulk upload of 12 complaints from a CSV
        setTimeout(() => {
            Store.metrics.total += 12;
            Store.metrics.open += 10;
            Store.metrics.resolved += 2;
            Store.metrics.critical += 4;
            
            UI.updateDashboard(Store.metrics);
            UI.showNotification("Batch processing complete! 12 new complaints analyzed and categorized.");
        }, 2000);
    },

    resetWorkspace() {
        // Reset the Store to default and refresh UI
        Store.metrics = { total: 8, open: 7, resolved: 1, critical: 3, confidence: 86, sentiment: "negative" };
        UI.updateDashboard(Store.metrics);
        UI.showNotification("Dashboard reset to initial database state.");
    }
};

// Boot up the application when the page loads
document.addEventListener('DOMContentLoaded', () => App.init());
    
