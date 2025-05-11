class ColorDetectionSystem {
    constructor() {
        this.videoElement = document.getElementById('videoFeed');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.permissionAlert = document.getElementById('permissionAlert');
        this.retryBtn = document.getElementById('retryBtn');
        this.statusText = document.getElementById('statusText');
        this.colorPreview = document.getElementById('colorPreview');
        this.alarmFile = document.getElementById('alarmFile');

        this.mediaStream = null;
        this.analysisInterval = null;
        this.alarmSound = null;
        this.audioContext = null;
        this.isAlarmActive = false;
        this.colorThreshold = 10;

        this.initialize();
    }

    initialize() {
        this.checkCameraSupport();
        this.setupEventListeners();
    }

    checkCameraSupport() {
        if (!navigator.mediaDevices?.getUserMedia) {
            this.showError('مرورگر شما از دوربین پشتیبانی نمی‌کند');
            this.startBtn.disabled = true;
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.activateCamera());
        this.stopBtn.addEventListener('click', () => this.stopSystem());
        this.retryBtn.addEventListener('click', () => this.activateCamera());
        this.alarmFile.addEventListener('change', (e) => this.loadAlarmSound(e));
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
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.permissionAlert.style.display = 'none';
        this.statusText.textContent = 'دوربین فعال - در حال تحلیل';
        this.startColorAnalysis();
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
            
            if (g > 80 && g > r * 1.5 && g > b * 1.5) greenPixels++;
        }
        
        const greenPercentage = (greenPixels / (pixelData.length / 4)) * 100;
        this.updateUI(greenPercentage);
        
        if (greenPercentage < this.colorThreshold && !this.isAlarmActive) {
            this.triggerAlarm();
        } else if (greenPercentage >= this.colorThreshold && this.isAlarmActive) {
            this.stopAlarm();
        }
    }

    async loadAlarmSound(event) {
        const file = event.target.files[0];
        if (!file) {
            this.showError('فایلی انتخاب نشده است');
            return;
        }
        
        if (!file.type.startsWith('audio/')) {
            this.showError('فقط فایل‌های صوتی MP3/WAV پشتیبانی می‌شوند');
            return;
        }

        try {
            this.alarmSound = new Audio(URL.createObjectURL(file));
            this.statusText.textContent = 'فایل آلارم آماده است';
        } catch (error) {
            this.showError('خطا در بارگذاری فایل صوتی');
        }
    }

    async triggerAlarm() {
        if (!this.alarmSound) {
            this.showError('لطفاً فایل آلارم را انتخاب کنید');
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume();
            this.alarmSound.loop = true;
            await this.alarmSound.play();
            this.isAlarmActive = true;
            this.statusText.classList.add('alert');
        } catch (error) {
            this.showError('برای پخش صدا روی صفحه کلیک کنید');
            document.addEventListener('click', this.playAlarmAfterClick.bind(this), { once: true });
        }
    }

    async playAlarmAfterClick() {
        try {
            await this.audioContext.resume();
            await this.alarmSound.play();
            this.isAlarmActive = true;
            this.statusText.classList.add('alert');
        } catch (error) {
            this.showError('خطا در پخش آلارم');
        }
    }

    stopAlarm() {
        if (this.alarmSound) {
            this.alarmSound.pause();
            this.alarmSound.currentTime = 0;
        }
        this.isAlarmActive = false;
        this.statusText.classList.remove('alert');
    }

    updateUI(percentage) {
        this.colorPreview.style.backgroundColor = `rgb(0, ${Math.min(255, percentage * 2.55)}, 0)`;
        this.statusText.textContent = `درصد سبزی: ${percentage.toFixed(1)}% | آستانه: ${this.colorThreshold}%`;
    }

    stopSystem() {
        if (this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
        if (this.analysisInterval) clearInterval(this.analysisInterval);
        this.stopAlarm();
        
        this.videoElement.srcObject = null;
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.statusText.textContent = 'سیستم متوقف شد';
        this.colorPreview.style.backgroundColor = 'transparent';
    }

    handleCameraError(error) {
        let message = 'خطا در دسترسی به دوربین';
        switch(error.name) {
            case 'NotAllowedError': message = 'دسترسی به دوربین رد شد!'; break;
            case 'NotFoundError': message = 'دوربین یافت نشد!'; break;
        }
        this.showError(message);
        this.permissionAlert.style.display = 'flex';
    }

    showError(message) {
        this.statusText.textContent = message;
        this.statusText.style.color = '#ff4444';
    }
}

// راه‌اندازی سیستم
document.addEventListener('DOMContentLoaded', () => {
    new ColorDetectionSystem();
});