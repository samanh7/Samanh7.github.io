class ColorDetectionSystem {
    constructor() {
        this.videoElement = document.getElementById('videoFeed');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.permissionAlert = document.getElementById('permissionAlert');
        this.retryBtn = document.getElementById('retryBtn');
        this.statusText = document.getElementById('statusText');
        this.colorPreview = document.getElementById('colorPreview');

        this.mediaStream = null;
        this.isCameraActive = false;
        this.analysisInterval = null;

        this.initialize();
    }

    initialize() {
        this.checkCameraSupport();
        this.setupEventListeners();
    }

    checkCameraSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('مرورگر شما از دوربین پشتیبانی نمی‌کند');
            this.startBtn.disabled = true;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.activateCamera());
        this.stopBtn.addEventListener('click', () => this.stopCamera());
        this.retryBtn.addEventListener('click', () => this.activateCamera());
    }

    async activateCamera() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            this.handleCameraSuccess();
        } catch (error) {
            this.handleCameraError(error);
        }
    }

    handleCameraSuccess() {
        this.videoElement.srcObject = this.mediaStream;
        this.isCameraActive = true;
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.permissionAlert.style.display = 'none';
        this.statusText.textContent = 'دوربین فعال - در حال تحلیل';
        this.startColorAnalysis();
    }

    handleCameraError(error) {
        console.error('Camera Error:', error);
        this.permissionAlert.style.display = 'flex';
        
        let errorMessage = 'خطا در دسترسی به دوربین';
        switch(error.name) {
            case 'NotAllowedError':
                errorMessage = 'دسترسی به دوربین رد شد!';
                break;
            case 'NotFoundError':
                errorMessage = 'دوربین یافت نشد';
                break;
            case 'OverconstrainedError':
                errorMessage = 'تنظیمات دوربین پشتیبانی نمی‌شود';
                break;
        }
        
        this.statusText.textContent = errorMessage;
        this.statusText.style.color = '#ff4444';
    }

    startColorAnalysis() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        this.analysisInterval = setInterval(() => {
            if (!this.videoElement.videoWidth) return;

            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            ctx.drawImage(this.videoElement, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            this.processFrame(imageData.data);
        }, 500);
    }

    processFrame(pixelData) {
        let greenPixels = 0;
        
        for (let i = 0; i < pixelData.length; i += 4) {
            const r = pixelData[i];
            const g = pixelData[i+1];
            const b = pixelData[i+2];
            
            if (this.isGreenPixel(r, g, b)) {
                greenPixels++;
            }
        }
        
        const greenPercentage = (greenPixels / (pixelData.length / 4)) * 100;
        this.updateUI(greenPercentage);
    }

    isGreenPixel(r, g, b) {
        return (
            g > 80 &&
            g > r * 1.5 &&
            g > b * 1.5 &&
            (g - r) > 30 &&
            (g - b) > 30
        );
    }

    updateUI(percentage) {
        this.colorPreview.style.backgroundColor = `rgb(0, ${Math.min(255, percentage * 2.55)}, 0)`;
        this.statusText.textContent = `درصد سبزی تشخیص داده شده: ${percentage.toFixed(1)}%`;
    }

    stopCamera() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        
        this.videoElement.srcObject = null;
        this.isCameraActive = false;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.statusText.textContent = 'سیستم متوقف شد';
        this.colorPreview.style.backgroundColor = 'transparent';
    }

    showError(message) {
        this.statusText.textContent = message;
        this.statusText.style.color = '#ff4444';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ColorDetectionSystem();
});