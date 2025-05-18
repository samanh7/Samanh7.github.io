class AdvancedColorDetector {
    constructor() {
        this.video = document.getElementById('videoFeed');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.statusText = document.getElementById('statusText');
        this.greenPercent = document.getElementById('greenPercent');
        this.redPercent = document.getElementById('redPercent');
        this.colorPreview = document.getElementById('colorPreview');
        
        this.mediaStream = null;
        this.analyserInterval = null;
        this.alarmSound = null;
        this.isAlarmActive = false;

        this.GREEN_THRESHOLD = 7;    // آستانه سبز
        this.RED_THRESHOLD = 0.5;    // آستانه قرمز
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkPermissions();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.stopBtn.addEventListener('click', () => this.stopSystem());
        document.getElementById('retryBtn').addEventListener('click', () => this.startCamera());
        document.getElementById('alarmFile').addEventListener('change', e => this.loadAlarm(e));
    }

    async startCamera() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.mediaStream;
            this.toggleUI(true);
            this.startAnalysis();
        } catch (error) {
            this.handleError('دوربین', error);
        }
    }

    startAnalysis() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        this.analyserInterval = setInterval(() => {
            canvas.width = this.video.videoWidth;
            canvas.height = this.video.videoHeight;
            ctx.drawImage(this.video, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const results = this.analyzeColors(imageData.data);
            
            this.updateDisplay(results);
            this.checkAlarm(results);
        }, 250);
    }

    analyzeColors(pixels) {
        let greenCount = 0;
        let redCount = 0;
        
        for(let i=0; i<pixels.length; i+=4) {
            const r = pixels[i];
            const g = pixels[i+1];
            const b = pixels[i+2];
            
            // تشخیص سبز
            if(g > 100 && g > r*1.8 && g > b*1.8) greenCount++;
            
            // تشخیص قرمز پیشرفته
            if(this.isRed(r, g, b)) redCount++;
        }
        
        return {
            green: (greenCount / (pixels.length/4)) * 100,
            red: (redCount / (pixels.length/4)) * 100
        };
    }

    isRed(r, g, b) {
        const hsv = this.rgbToHsv(r, g, b);
        return (
            (hsv.h <= 10 || hsv.h >= 350) && // محدوده Hue گسترده
            hsv.s >= 85 && 
            hsv.v >= 85 &&
            r > 150 &&
            r > g*3 &&
            r > b*3
        );
    }

    rgbToHsv(r, g, b) {
        r /= 255, g /= 255, b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0, v = max;
        const d = max - min;

        if(max !== 0) s = d / max;

        if(max === min) {
            h = 0;
        } else {
            switch(max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
            if(h < 0) h += 360;
        }

        return {
            h: Math.round(h),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    }

    updateDisplay({green, red}) {
        this.greenPercent.textContent = green.toFixed(1);
        this.redPercent.textContent = red.toFixed(2);
        this.colorPreview.style.backgroundColor = `rgb(${Math.min(255, red*2.55)}, 0, 0)`;
    }

    checkAlarm({green, red}) {
        if(green < this.GREEN_THRESHOLD || red > this.RED_THRESHOLD) {
            this.triggerAlarm();
        } else {
            this.stopAlarm();
        }
    }

    async triggerAlarm() {
        if(!this.alarmSound) return;
        
        try {
            await this.alarmSound.play();
            this.alarmSound.loop = true;
            this.statusText.textContent = '🚨 هشدار! رنگ غیرمجاز تشخیص داده شد';
            this.statusText.style.color = 'var(--danger)';
        } catch(error) {
            console.error('خطای پخش صدا:', error);
        }
    }

    stopAlarm() {
        if(this.alarmSound) {
            this.alarmSound.pause();
            this.alarmSound.currentTime = 0;
        }
        this.statusText.textContent = 'وضعیت: سیستم در حال نظارت';
        this.statusText.style.color = 'var(--text-light)';
    }

    async loadAlarm(event) {
        const file = event.target.files[0];
        if(!file) return;

        try {
            this.alarmSound = new Audio(URL.createObjectURL(file));
            this.statusText.textContent = '🔊 فایل آلارم آماده است';
        } catch(error) {
            this.handleError('صدا', error);
        }
    }

    toggleUI(isActive) {
        this.startBtn.disabled = isActive;
        this.stopBtn.disabled = !isActive;
    }

    stopSystem() {
        if(this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop());
        if(this.analyserInterval) clearInterval(this.analyserInterval);
        this.toggleUI(false);
        this.statusText.textContent = 'وضعیت: سیستم متوقف شد';
    }

    handleError(context, error) {
        let message = '';
        switch(error.name) {
            case 'NotAllowedError': message = 'دسترسی رد شد!'; break;
            case 'NotFoundError': message = 'دوربین یافت نشد!'; break;
            default: message = 'خطای ناشناخته!';
        }
        this.statusText.textContent = `❌ ${context}: ${message}`;
        this.statusText.style.color = 'var(--danger)';
    }
}

// راه‌اندازی سیستم
window.addEventListener('DOMContentLoaded', () => {
    new AdvancedColorDetector();
});