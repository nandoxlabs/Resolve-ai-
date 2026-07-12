/**
 * Resolve AI - Complaints Intelligence Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab our elements from the HTML
    const analyzeBtn = document.getElementById('btn-analyze');
    const complaintInput = document.getElementById('complaint-input');
    const resultsCard = document.getElementById('ai-results');
    const executeBtn = document.getElementById('btn-execute');

    // 2. Listen for the Analyze Button Click
    analyzeBtn.addEventListener('click', () => {
        const text = complaintInput.value.trim();
        
        if (!text) {
            alert("Please paste a complaint first!");
            return;
        }

        // Change button to show it's "thinking"
        analyzeBtn.textContent = "Analyzing... (Running AI Models)";
        analyzeBtn.disabled = true;

        // 3. Simulate AI Processing Time (1.5 seconds)
        setTimeout(() => {
            // Generate mock AI responses based on the length/content of the text
            const isRefund = text.toLowerCase().includes('charge') || text.toLowerCase().includes('money');
            
            // Populate the results card
            document.getElementById('res-category').textContent = isRefund ? "Billing Error" : "Service Issue";
            document.getElementById('res-sentiment').textContent = "Highly Negative";
            
            document.getElementById('res-summary').textContent = `Customer is expressing severe frustration regarding: "${text.substring(0, 40)}..."`;
            
            document.getElementById('res-rootcause').textContent = isRefund ? "System duplicate charge anomaly." : "Communication breakdown in support tier 1.";
            
            document.getElementById('res-action').textContent = isRefund ? "Process immediate full refund and send apology template." : "Escalate to Tier 2 support immediately.";

            // Show the results card and reset the button
            resultsCard.classList.remove('hidden');
            analyzeBtn.textContent = "Analyze with AI";
            analyzeBtn.disabled = false;

        }, 1500); // 1.5 second delay
    });

    // 4. Listen for the Execute Action button
    executeBtn.addEventListener('click', () => {
        executeBtn.textContent = "Executing...";
        executeBtn.disabled = true;
        
        setTimeout(() => {
            alert("Success! Action executed and logged to database.");
            
            // Reset the form for the next complaint
            complaintInput.value = "";
            resultsCard.classList.add('hidden');
            executeBtn.textContent = "Execute Resolution";
            executeBtn.disabled = false;
        }, 800);
    });
});
                
