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
        } else {
            document.getElementById('timestamp').textContent = 'Unknown';
        }
        
        // Display JSON data
        const jsonDisplay = document.getElementById('json-display');
        jsonDisplay.innerHTML = this.renderJSON(this.experimentData.data, 'Experimental Data');
    }
    
    renderJSON(data, key = null, level = 0) {
        if (data === null) {
            return `<div class="json-value null">null</div>`;
        }
        
        if (typeof data === 'string') {
            return `<div class="json-value string">"${this.escapeHtml(data)}"</div>`;
        }
        
        if (typeof data === 'number') {
            return `<div class="json-value number">${data}</div>`;
        }
        
        if (typeof data === 'boolean') {
            return `<div class="json-value boolean">${data}</div>`;
        }
        
        if (Array.isArray(data)) {
            return this.renderArray(data, key, level);
        }
        
        if (typeof data === 'object') {
            return this.renderObject(data, key, level);
        }
        
        return `<div class="json-value">${this.escapeHtml(String(data))}</div>`;
    }
    
    renderObject(obj, key, level) {
        const id = `obj-${Math.random().toString(36).substr(2, 9)}`;
        const entries = Object.entries(obj);
        
        if (entries.length === 0) {
            return `<div class="json-value">{}</div>`;
        }
        
        let html = '';
        if (key) {
            html += `
                <div class="json-key" onclick="toggleSection('${id}')">
                    <i class="fas fa-chevron-down"></i>
                    <strong>${this.escapeHtml(key)}</strong>
                    <span style="color: #7f8c8d; font-weight: normal;">({${entries.length} ${entries.length === 1 ? 'property' : 'properties'}})</span>
                </div>
            `;
        }
        
        html += `<div class="json-content" id="${id}">`;
        
        entries.forEach(([childKey, childValue]) => {
            html += `
                <div class="json-object">
                    ${this.renderJSON(childValue, childKey, level + 1)}
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderArray(arr, key, level) {
        const id = `arr-${Math.random().toString(36).substr(2, 9)}`;
        
        if (arr.length === 0) {
            return `<div class="json-value">[]</div>`;
        }
        
        let html = '';
        if (key) {
            html += `
                <div class="json-key" onclick="toggleSection('${id}')">
                    <i class="fas fa-chevron-down"></i>
                    <strong>${this.escapeHtml(key)}</strong>
                    <span style="color: #7f8c8d; font-weight: normal;">[${arr.length} ${arr.length === 1 ? 'item' : 'items'}]</span>
                </div>
            `;
        }
        
        html += `<div class="json-content" id="${id}">`;
        
        arr.forEach((item, index) => {
            html += `
                <div class="json-array">
                    <span class="array-index">[${index}]</span>
                    ${this.renderJSON(item, null, level + 1)}
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
        if (!this.isDataLoaded || !window.jsPDF) {
            alert('PDF export is not available. Please make sure the data is loaded.');
            return;
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
            const filename = `experiment_${this.experimentId.substr(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(filename);
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');
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
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        new ExperimentTracker();
    }, 1000);
});

// Handle Firebase initialization errors
window.addEventListener('error', (event) => {
    if (event.message.includes('Firebase')) {
        console.error('Firebase initialization error:', event.error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error-message').textContent = 'Firebase configuration error. Please check the setup.';
    }
}); 