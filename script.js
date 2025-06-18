// Experiment Tracker JavaScript
class ExperimentTracker {
    constructor() {
        this.experimentId = null;
        this.experimentData = null;
        this.isDataLoaded = false;
        
        this.init();
    }
    
    init() {
        // Get experiment ID from URL parameters
        this.experimentId = this.getUrlParameter('id');
        
        if (!this.experimentId) {
            this.showError('No experiment ID provided in URL', 'Please scan a valid QR code or check the URL.');
            return;
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load experiment data
        this.loadExperimentData();
    }
    
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }
    
    setupEventListeners() {
        // Retry button
        document.getElementById('retry-btn')?.addEventListener('click', () => {
            this.loadExperimentData();
        });
        
        // Export PDF button
        document.getElementById('export-pdf')?.addEventListener('click', () => {
            this.exportToPDF();
        });
        
        // Expand/Collapse buttons
        document.getElementById('expand-all')?.addEventListener('click', () => {
            this.toggleAllSections(false);
        });
        
        document.getElementById('collapse-all')?.addEventListener('click', () => {
            this.toggleAllSections(true);
        });
    }
    
    async loadExperimentData() {
        try {
            this.showLoading();
            
            // Check if Firebase is available
            if (!window.firebase) {
                throw new Error('Firebase not initialized');
            }
            
            const { db, doc, getDoc } = window.firebase;
            
            // Fetch document from Firestore
            const docRef = doc(db, 'experiments', this.experimentId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Experiment not found');
            }
            
            this.experimentData = docSnap.data();
            console.log('Loaded experiment data:', this.experimentData); // Debug log
            this.displayExperimentData();
            this.isDataLoaded = true;
            
        } catch (error) {
            console.error('Error loading experiment data:', error);
            this.showError('Failed to load experiment data', error.message);
        }
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('data-container').style.display = 'none';
    }
    
    showError(title, message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('data-container').style.display = 'none';
        
        document.getElementById('error-message').textContent = message || title;
    }
    
    displayExperimentData() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'none';
        document.getElementById('data-container').style.display = 'block';
        
        // Update metadata
        document.getElementById('filename').textContent = this.experimentData.filename || 'Unknown';
        document.getElementById('experiment-id').textContent = this.experimentId;
        
        // Format timestamp
        if (this.experimentData.timestamp) {
            const date = this.experimentData.timestamp.toDate ? 
                this.experimentData.timestamp.toDate() : 
                new Date(this.experimentData.timestamp);
            document.getElementById('timestamp').textContent = date.toLocaleString();
        } else if (this.experimentData.metadata && this.experimentData.metadata.uploaded_at) {
            const date = new Date(this.experimentData.metadata.uploaded_at);
            document.getElementById('timestamp').textContent = date.toLocaleString();
        } else {
            document.getElementById('timestamp').textContent = 'Unknown';
        }
        
        // Display JSON data
        const jsonDisplay = document.getElementById('json-display');
        jsonDisplay.innerHTML = this.renderJSON(this.experimentData.data, 'Experimental Data', 0, true);
    }
    
    renderJSON(data, key = null, level = 0, isRoot = false) {
        if (data === null) {
            return this.createValueElement('null', 'null');
        }
        
        if (typeof data === 'string') {
            return this.createValueElement(`"${this.escapeHtml(data)}"`, 'string', key);
        }
        
        if (typeof data === 'number') {
            return this.createValueElement(data, 'number', key);
        }
        
        if (typeof data === 'boolean') {
            return this.createValueElement(data, 'boolean', key);
        }
        
        if (Array.isArray(data)) {
            return this.renderArray(data, key, level);
        }
        
        if (typeof data === 'object') {
            return this.renderObject(data, key, level, isRoot);
        }
        
        return this.createValueElement(this.escapeHtml(String(data)), 'unknown', key);
    }
    
    createValueElement(value, type, key = null) {
        let html = '';
        if (key) {
            html += `<div class="json-property">
                <span class="json-key-label">${this.escapeHtml(key)}:</span>
                <span class="json-value ${type}">${value}</span>
            </div>`;
        } else {
            html += `<div class="json-value ${type}">${value}</div>`;
        }
        return html;
    }
    
    renderObject(obj, key, level, isRoot = false) {
        const id = `obj-${Math.random().toString(36).substr(2, 9)}`;
        const entries = Object.entries(obj);
        
        if (entries.length === 0) {
            return key ? this.createValueElement('{}', 'object', key) : '<div class="json-value object">{}</div>';
        }
        
        let html = '';
        
        // For root level, don't show a collapsible header
        if (!isRoot && key) {
            html += `
                <div class="json-key" onclick="toggleSection('${id}')">
                    <i class="fas fa-chevron-down"></i>
                    <strong>${this.escapeHtml(key)}</strong>
                    <span class="json-count">({${entries.length} ${entries.length === 1 ? 'property' : 'properties'}})</span>
                </div>
            `;
        } else if (isRoot) {
            html += `<div class="json-root-label">Experimental Data (${entries.length} ${entries.length === 1 ? 'property' : 'properties'})</div>`;
        }
        
        const contentClass = isRoot ? 'json-root-content' : 'json-content';
        html += `<div class="${contentClass}" ${!isRoot ? `id="${id}"` : ''}>`;
        
        entries.forEach(([childKey, childValue]) => {
            html += `<div class="json-item">${this.renderJSON(childValue, childKey, level + 1)}</div>`;
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderArray(arr, key, level) {
        const id = `arr-${Math.random().toString(36).substr(2, 9)}`;
        
        if (arr.length === 0) {
            return key ? this.createValueElement('[]', 'array', key) : '<div class="json-value array">[]</div>';
        }
        
        let html = '';
        if (key) {
            html += `
                <div class="json-key" onclick="toggleSection('${id}')">
                    <i class="fas fa-chevron-down"></i>
                    <strong>${this.escapeHtml(key)}</strong>
                    <span class="json-count">[${arr.length} ${arr.length === 1 ? 'item' : 'items'}]</span>
                </div>
            `;
        }
        
        html += `<div class="json-content" id="${id}">`;
        
        arr.forEach((item, index) => {
            html += `
                <div class="json-item">
                    <div class="array-item">
                        <span class="array-index">[${index}]</span>
                        <div class="array-value">${this.renderJSON(item, null, level + 1)}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    toggleAllSections(collapse) {
        const sections = document.querySelectorAll('.json-content');
        const keys = document.querySelectorAll('.json-key');
        
        sections.forEach(section => {
            if (collapse) {
                section.classList.add('collapsed');
            } else {
                section.classList.remove('collapsed');
            }
        });
        
        keys.forEach(key => {
            if (collapse) {
                key.classList.add('collapsed');
            } else {
                key.classList.remove('collapsed');
            }
        });
    }
    
    async exportToPDF() {
        if (!this.isDataLoaded) {
            alert('Please wait for the data to load before exporting to PDF.');
            return;
        }
        
        // Try multiple PDF export methods
        if (await this.tryJsPDFExport()) {
            return; // Success with jsPDF
        } else if (this.tryBrowserPrint()) {
            return; // Success with browser print
        } else {
            this.fallbackTextExport(); // Fallback to text download
        }
    }
    
    async tryJsPDFExport() {
        // Wait a bit for jsPDF to load if it's still loading
        let attempts = 0;
        while (!window.jsPDF && attempts < 20) {
            await new Promise(resolve => setTimeout(resolve, 250));
            attempts++;
        }
        
        if (!window.jsPDF) {
            console.log('jsPDF not available after waiting');
            return false;
        }
        
        try {
            const { jsPDF } = window.jsPDF;
            const pdf = new jsPDF();
            
            // Title
            pdf.setFontSize(20);
            pdf.text('Experimental Setup Data', 20, 30);
            
            // Metadata
            pdf.setFontSize(12);
            let yPos = 50;
            pdf.text(`File: ${this.experimentData.filename || 'Unknown'}`, 20, yPos);
            yPos += 10;
            pdf.text(`ID: ${this.experimentId}`, 20, yPos);
            yPos += 10;
            
            if (this.experimentData.timestamp) {
                const date = this.experimentData.timestamp.toDate ? 
                    this.experimentData.timestamp.toDate() : 
                    new Date(this.experimentData.timestamp);
                pdf.text(`Date: ${date.toLocaleString()}`, 20, yPos);
                yPos += 20;
            } else if (this.experimentData.metadata && this.experimentData.metadata.uploaded_at) {
                const date = new Date(this.experimentData.metadata.uploaded_at);
                pdf.text(`Date: ${date.toLocaleString()}`, 20, yPos);
                yPos += 20;
            }
            
            // JSON Data
            pdf.setFontSize(10);
            const jsonText = JSON.stringify(this.experimentData.data, null, 2);
            const lines = pdf.splitTextToSize(jsonText, 170);
            
            lines.forEach(line => {
                if (yPos > 280) {
                    pdf.addPage();
                    yPos = 20;
                }
                pdf.text(line, 20, yPos);
                yPos += 5;
            });
            
            // Save PDF
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `experiment_${this.experimentId.substring(0, 8)}_${timestamp}.pdf`;
            pdf.save(filename);
            
            console.log('PDF exported successfully via jsPDF');
            return true;
            
        } catch (error) {
            console.error('Error exporting PDF via jsPDF:', error);
            return false;
        }
    }
    
    tryBrowserPrint() {
        try {
            // Create a printable version
            const printContent = this.createPrintableContent();
            const printWindow = window.open('', '_blank');
            
            if (!printWindow) {
                alert('Popup blocked. Please allow popups and try again.');
                return false;
            }
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Experiment Data - ${this.experimentId}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 20px; 
                            line-height: 1.4;
                        }
                        .header { 
                            border-bottom: 2px solid #333; 
                            padding-bottom: 10px; 
                            margin-bottom: 20px; 
                        }
                        .metadata { margin-bottom: 20px; }
                        .json-data { 
                            background: #f5f5f5; 
                            padding: 15px; 
                            border-radius: 5px;
                            white-space: pre-wrap;
                            font-family: monospace;
                        }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <div class="no-print" style="margin-top: 20px;">
                        <button onclick="window.print()">Print to PDF</button>
                        <button onclick="window.close()">Close</button>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Auto-trigger print dialog
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
            console.log('Opened print dialog as PDF fallback');
            return true;
            
        } catch (error) {
            console.error('Error with browser print method:', error);
            return false;
        }
    }
    
    createPrintableContent() {
        const timestamp = this.experimentData.timestamp ? 
            (this.experimentData.timestamp.toDate ? 
                this.experimentData.timestamp.toDate() : 
                new Date(this.experimentData.timestamp)).toLocaleString() :
            (this.experimentData.metadata && this.experimentData.metadata.uploaded_at ? 
                new Date(this.experimentData.metadata.uploaded_at).toLocaleString() : 
                'Unknown');
                
        return `
            <div class="header">
                <h1>Experimental Setup Data</h1>
            </div>
            <div class="metadata">
                <p><strong>File:</strong> ${this.experimentData.filename || 'Unknown'}</p>
                <p><strong>ID:</strong> ${this.experimentId}</p>
                <p><strong>Date:</strong> ${timestamp}</p>
            </div>
            <div class="json-data">
                <h3>Experimental Data:</h3>
                ${JSON.stringify(this.experimentData.data, null, 2)}
            </div>
        `;
    }
    
    fallbackTextExport() {
        try {
            const timestamp = this.experimentData.timestamp ? 
                (this.experimentData.timestamp.toDate ? 
                    this.experimentData.timestamp.toDate() : 
                    new Date(this.experimentData.timestamp)).toLocaleString() :
                (this.experimentData.metadata && this.experimentData.metadata.uploaded_at ? 
                    new Date(this.experimentData.metadata.uploaded_at).toLocaleString() : 
                    'Unknown');
                    
            const content = `EXPERIMENTAL SETUP DATA
============================

File: ${this.experimentData.filename || 'Unknown'}
ID: ${this.experimentId}
Date: ${timestamp}

EXPERIMENTAL DATA:
${JSON.stringify(this.experimentData.data, null, 2)}
`;
            
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `experiment_${this.experimentId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            
            alert('PDF export not available. Data downloaded as text file instead.');
            console.log('Exported as text file fallback');
            
        } catch (error) {
            console.error('Error with text fallback export:', error);
            alert('Export failed. Please copy the data manually.');
        }
    }
}

// Global function for toggling sections
function toggleSection(id) {
    const section = document.getElementById(id);
    const key = document.querySelector(`[onclick="toggleSection('${id}')"]`);
    
    if (section && key) {
        section.classList.toggle('collapsed');
        key.classList.toggle('collapsed');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking Firebase...');
    
    // Check Firebase availability with retries
    let retryCount = 0;
    const maxRetries = 10;
    
    const initializeApp = () => {
        if (window.firebase && window.firebase.db) {
            console.log('Firebase is ready, initializing ExperimentTracker...');
            new ExperimentTracker();
        } else if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Firebase not ready yet, retry ${retryCount}/${maxRetries}...`);
            setTimeout(initializeApp, 500);
        } else {
            console.error('Firebase failed to initialize after maximum retries');
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error-message').textContent = 'Firebase initialization timeout. Please refresh the page.';
        }
    };
    
    // Start initialization
    initializeApp();
});

// Handle Firebase initialization errors
window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('Firebase')) {
        console.error('Firebase initialization error:', event.error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-message').textContent = 'Firebase configuration error. Please check the setup.';
    }
}); 