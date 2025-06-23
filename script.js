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
        const processedValue = this.processMediaValue(value, key);
        
        if (key) {
            html += `<div class="json-property">
                <span class="json-key-label">${this.escapeHtml(key)}:</span>
                <span class="json-value ${type}">${processedValue}</span>
            </div>`;
        } else {
            html += `<div class="json-value ${type}">${processedValue}</div>`;
        }
        return html;
    }
    
    processMediaValue(value, key = null) {
        // Check if this looks like a media file
        if (typeof value === 'string') {
            // Check for image patterns
            if (this.isImageValue(value, key)) {
                return this.createImageElement(value, key);
            }
            // Check for video patterns
            if (this.isVideoValue(value, key)) {
                return this.createVideoElement(value, key);
            }
            // Check for file patterns
            if (this.isFileValue(value, key)) {
                return this.createFileElement(value, key);
            }
        }
        
        // Return escaped HTML for regular text
        return this.escapeHtml(String(value));
    }
    
    isImageValue(value, key) {
        const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i;
        const imageTypes = /photo|image|picture|img|snapshot|camera/i;
        const mobileImageUri = /^content:\/\/.*images/i;
        const httpImageUrl = /^https?:\/\/.*\.(jpg|jpeg|png|gif|bmp|webp|svg)/i;
        
        return imageExtensions.test(value) || 
               (key && imageTypes.test(key)) ||
               mobileImageUri.test(value) ||
               httpImageUrl.test(value);
    }
    
    isVideoValue(value, key) {
        const videoExtensions = /\.(mp4|mov|avi|mkv|webm|m4v|3gp)$/i;
        const videoTypes = /video|movie|clip|recording/i;
        const mobileVideoUri = /^content:\/\/.*video/i;
        const httpVideoUrl = /^https?:\/\/.*\.(mp4|mov|avi|mkv|webm|m4v)/i;
        
        return videoExtensions.test(value) || 
               (key && videoTypes.test(key)) ||
               mobileVideoUri.test(value) ||
               httpVideoUrl.test(value);
    }
    
    isFileValue(value, key) {
        const fileExtensions = /\.(pdf|doc|docx|xls|xlsx|csv|txt|zip|rar)$/i;
        const fileTypes = /file|document|attachment|data/i;
        
        return fileExtensions.test(value) || 
               (key && fileTypes.test(key) && !this.isImageValue(value, key) && !this.isVideoValue(value, key));
    }
    
    createImageElement(src, alt) {
        const imageId = `img-${Math.random().toString(36).substr(2, 9)}`;
        const displayName = this.getDisplayName(src, alt);
        
        if (this.isValidUrl(src)) {
            return `
                <div class="media-container image-container">
                    <div class="media-info">
                        <i class="fas fa-image"></i>
                        <span class="media-name">${displayName}</span>
                        <button class="media-toggle" onclick="toggleMedia('${imageId}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                    <div class="media-content collapsed" id="${imageId}">
                        <img src="${src}" alt="${this.escapeHtml(alt || 'Experiment Image')}" 
                             class="experiment-image" 
                             onerror="this.parentElement.innerHTML='<div class=error-media><i class=fas fa-exclamation-triangle></i> Image could not be loaded<br><small>${this.escapeHtml(src)}</small></div>'"
                             onclick="openImageModal(this.src, '${this.escapeHtml(alt || 'Experiment Image')}')">
                        <div class="image-caption">${this.escapeHtml(alt || 'Experiment Image')}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="media-container image-container unavailable">
                    <div class="media-info">
                        <i class="fas fa-image"></i>
                        <span class="media-name">${displayName}</span>
                        <span class="media-status">📱 Mobile image (not accessible via web)</span>
                    </div>
                    <div class="media-path">${this.escapeHtml(src)}</div>
                </div>
            `;
        }
    }
    
    createVideoElement(src, alt) {
        const videoId = `vid-${Math.random().toString(36).substr(2, 9)}`;
        const displayName = this.getDisplayName(src, alt);
        
        if (this.isValidUrl(src)) {
            return `
                <div class="media-container video-container">
                    <div class="media-info">
                        <i class="fas fa-video"></i>
                        <span class="media-name">${displayName}</span>
                        <button class="media-toggle" onclick="toggleMedia('${videoId}')">
                            <i class="fas fa-play"></i> Play
                        </button>
                    </div>
                    <div class="media-content collapsed" id="${videoId}">
                        <video controls class="experiment-video">
                            <source src="${src}" type="video/mp4">
                            <source src="${src}" type="video/webm">
                            Your browser does not support the video tag.
                        </video>
                        <div class="video-caption">${this.escapeHtml(alt || 'Experiment Video')}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="media-container video-container unavailable">
                    <div class="media-info">
                        <i class="fas fa-video"></i>
                        <span class="media-name">${displayName}</span>
                        <span class="media-status">📱 Mobile video (not accessible via web)</span>
                    </div>
                    <div class="media-path">${this.escapeHtml(src)}</div>
                </div>
            `;
        }
    }
    
    createFileElement(src, alt) {
        const displayName = this.getDisplayName(src, alt);
        const extension = src.split('.').pop().toLowerCase();
        const icon = this.getFileIcon(extension);
        
        if (this.isValidUrl(src)) {
            return `
                <div class="media-container file-container">
                    <div class="media-info">
                        <i class="fas fa-${icon}"></i>
                        <span class="media-name">${displayName}</span>
                        <a href="${src}" target="_blank" class="media-link">
                            <i class="fas fa-external-link-alt"></i> Open
                        </a>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="media-container file-container unavailable">
                    <div class="media-info">
                        <i class="fas fa-${icon}"></i>
                        <span class="media-name">${displayName}</span>
                        <span class="media-status">📱 Local file (not accessible via web)</span>
                    </div>
                    <div class="media-path">${this.escapeHtml(src)}</div>
                </div>
            `;
        }
    }
    
    getDisplayName(src, alt) {
        if (alt && alt.trim()) return alt;
        if (src.includes('/')) return src.split('/').pop();
        return src;
    }
    
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    
    getFileIcon(extension) {
        const iconMap = {
            'pdf': 'file-pdf',
            'doc': 'file-word', 'docx': 'file-word',
            'xls': 'file-excel', 'xlsx': 'file-excel',
            'csv': 'file-csv',
            'txt': 'file-alt',
            'zip': 'file-archive', 'rar': 'file-archive',
            'default': 'file'
        };
        return iconMap[extension] || iconMap['default'];
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
        
        // Use in-page print modal as primary method (most reliable)
        console.log('Opening export options modal...');
        this.showPrintableView();
    }
    
    async tryJsPDFExport() {
        // Load jsPDF on demand
        console.log('Attempting to load jsPDF...');
        const loaded = await window.loadJsPDF();
        
        if (!loaded || !window.jsPDF) {
            console.log('jsPDF could not be loaded');
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
            // Instead of popup, create a printable view in the current page
            this.showPrintableView();
            console.log('Showing in-page printable view');
            return true;
            
        } catch (error) {
            console.error('Error with browser print method:', error);
            return false;
        }
    }
    
    showPrintableView() {
        // Create overlay with printable content
        const overlay = document.createElement('div');
        overlay.id = 'print-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const printContainer = document.createElement('div');
        printContainer.style.cssText = `
            background: white;
            border-radius: 10px;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        
        const printContent = this.createPrintableContent();
        printContainer.innerHTML = `
            <div style="padding: 30px;">
                ${printContent}
                <div style="margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px;">
                    <div style="margin-bottom: 15px;">
                        <p style="color: #666; margin: 0 0 15px 0; font-size: 14px;"><strong>Choose your preferred export method:</strong></p>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 15px;">
                        <button id="do-print" style="background: #667eea; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; min-width: 140px;">🖨️ Print as PDF</button>
                        <button id="try-jspdf" style="background: #8e44ad; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; min-width: 140px;">📄 Generate PDF</button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 15px;">
                        <button id="copy-data" style="background: #27ae60; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; min-width: 140px;">📋 Copy Data</button>
                        <button id="download-text" style="background: #e67e22; color: white; border: none; padding: 12px 20px; border-radius: 5px; cursor: pointer; font-size: 14px; min-width: 140px;">💾 Download Text</button>
                    </div>
                    <button id="close-print" style="background: #95a5a6; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer; font-size: 14px;">❌ Close</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(printContainer);
        document.body.appendChild(overlay);
        
        // Add event listeners
        document.getElementById('do-print').addEventListener('click', () => {
            window.print();
        });
        
        document.getElementById('try-jspdf').addEventListener('click', async () => {
            const button = document.getElementById('try-jspdf');
            const originalText = button.innerHTML;
            button.innerHTML = '⏳ Generating...';
            button.disabled = true;
            
            const success = await this.tryJsPDFExport();
            if (success) {
                button.innerHTML = '✅ PDF Generated!';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 2000);
            } else {
                button.innerHTML = '❌ PDF Failed';
                button.style.background = '#e74c3c';
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.style.background = '#8e44ad';
                    button.disabled = false;
                }, 3000);
            }
        });
        
        document.getElementById('copy-data').addEventListener('click', () => {
            this.copyDataToClipboard();
        });
        
        document.getElementById('download-text').addEventListener('click', () => {
            this.fallbackTextExport();
        });
        
        document.getElementById('close-print').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        // Add print styles
        const printStyles = document.createElement('style');
        printStyles.innerHTML = `
            @media print {
                body * {
                    visibility: hidden;
                }
                #print-overlay, #print-overlay * {
                    visibility: visible;
                }
                #print-overlay {
                    position: static !important;
                    background: white !important;
                    padding: 0 !important;
                }
                #print-overlay > div {
                    box-shadow: none !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                #print-overlay button {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(printStyles);
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
    
    copyDataToClipboard() {
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
${JSON.stringify(this.experimentData.data, null, 2)}`;

            navigator.clipboard.writeText(content).then(() => {
                alert('✅ Experimental data copied to clipboard! You can now paste it into any document.');
                console.log('Data copied to clipboard successfully');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = content;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('✅ Experimental data copied to clipboard! You can now paste it into any document.');
                    console.log('Data copied to clipboard via fallback method');
                } catch (err) {
                    alert('❌ Could not copy to clipboard. Please copy the data manually.');
                    console.error('Copy to clipboard failed:', err);
                }
                document.body.removeChild(textArea);
            });
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            alert('❌ Could not copy to clipboard. Please try the download option instead.');
        }
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
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✅ Data downloaded as text file successfully!');
            console.log('Exported as text file fallback');
            
        } catch (error) {
            console.error('Error with text fallback export:', error);
            alert('❌ Export failed. Please copy the data manually.');
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

// Global function for toggling media
function toggleMedia(id) {
    const media = document.getElementById(id);
    const button = document.querySelector(`[onclick="toggleMedia('${id}')"]`);
    
    if (media && button) {
        media.classList.toggle('collapsed');
        const isCollapsed = media.classList.contains('collapsed');
        
        if (button.innerHTML.includes('View')) {
            button.innerHTML = isCollapsed ? '<i class="fas fa-eye"></i> View' : '<i class="fas fa-eye-slash"></i> Hide';
        } else if (button.innerHTML.includes('Play')) {
            button.innerHTML = isCollapsed ? '<i class="fas fa-play"></i> Play' : '<i class="fas fa-pause"></i> Hide';
            
            // Pause video when hiding
            if (isCollapsed) {
                const video = media.querySelector('video');
                if (video) video.pause();
            }
        }
    }
}

// Global function for opening image modal
function openImageModal(src, alt) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 20000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
        cursor: zoom-out;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90%; max-height: 90%;">
            <img src="${src}" alt="${alt}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: -40px; right: 0; background: rgba(255,255,255,0.9); padding: 5px 10px; border-radius: 5px; font-size: 14px; color: #333;">${alt}</div>
            <button style="position: absolute; top: -40px; left: 0; background: rgba(255,255,255,0.9); border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 14px;" onclick="this.parentElement.parentElement.remove()">✕ Close</button>
        </div>
    `;
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.body.appendChild(modal);
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