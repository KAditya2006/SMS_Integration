class OTPLoginApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentScreen = 'login-screen';
        this.currentPhone = '';
        this.countdownInterval = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkExistingAuth();
    }

    initializeElements() {
        // Screens
        this.loginScreen = document.getElementById('login-screen');
        this.otpScreen = document.getElementById('otp-screen');
        this.dashboardScreen = document.getElementById('dashboard-screen');
        
        // Forms
        this.loginForm = document.getElementById('login-form');
        this.otpForm = document.getElementById('otp-form');
        
        // Inputs
        this.phoneInput = document.getElementById('phone');
        this.otpInput = document.getElementById('otp');
        
        // Buttons
        this.sendOtpBtn = document.getElementById('send-otp-btn');
        this.verifyOtpBtn = document.getElementById('verify-otp-btn');
        this.resendOtpBtn = document.getElementById('resend-otp-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        
        // Display elements
        this.phoneDisplay = document.getElementById('phone-display');
        this.userPhone = document.getElementById('user-phone');
        this.lastLogin = document.getElementById('last-login');
        this.accountCreated = document.getElementById('account-created');
        this.countdownElement = document.getElementById('countdown');
        this.timerElement = document.getElementById('timer');
        
        // UI components
        this.loadingSpinner = document.getElementById('loading-spinner');
        this.toast = document.getElementById('toast');
    }

    attachEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleSendOtp(e));
        this.otpForm.addEventListener('submit', (e) => this.handleVerifyOtp(e));
        this.resendOtpBtn.addEventListener('click', () => this.handleResendOtp());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Auto-advance OTP input
        this.otpInput.addEventListener('input', (e) => {
            if (e.target.value.length === 6) {
                this.handleVerifyOtp(new Event('submit'));
            }
        });
        
        // Format phone input
        this.phoneInput.addEventListener('input', (e) => {
            this.formatPhoneInput(e.target);
        });
    }

    formatPhoneInput(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value && !value.startsWith('+')) {
            value = '+' + value;
        }
        
        input.value = value;
    }

    async checkExistingAuth() {
        const token = localStorage.getItem('authToken');
        
        if (token) {
            try {
                this.showLoading(true);
                const user = await this.fetchUserInfo(token);
                this.showDashboard(user);
                this.showToast('Welcome back!', 'success');
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('authToken');
                this.showScreen('login-screen');
            } finally {
                this.showLoading(false);
            }
        } else {
            this.showScreen('login-screen');
        }
    }

    async handleSendOtp(e) {
        e.preventDefault();
        
        const phone = this.phoneInput.value.trim();
        
        if (!this.validatePhone(phone)) {
            this.showToast('Please enter a valid phone number with country code (e.g., +1234567890)', 'error');
            return;
        }

        this.currentPhone = phone;
        
        try {
            this.showLoading(true);
            this.sendOtpBtn.disabled = true;
            
            const response = await fetch(`${this.apiBaseUrl}/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (data.success) {
                this.showOtpScreen();
                this.startCountdown();
                this.showToast('OTP sent successfully!', 'success');
            } else {
                this.showToast(data.message || 'Failed to send OTP', 'error');
            }
        } catch (error) {
            console.error('Send OTP error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
            this.sendOtpBtn.disabled = false;
        }
    }

    async handleVerifyOtp(e) {
        if (e) e.preventDefault();
        
        const code = this.otpInput.value.trim();
        
        if (!this.validateOtp(code)) {
            this.showToast('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        try {
            this.showLoading(true);
            this.verifyOtpBtn.disabled = true;
            
            const response = await fetch(`${this.apiBaseUrl}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: this.currentPhone,
                    code: code
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('authToken', data.token);
                this.showDashboard(data.user);
                this.showToast('Login successful!', 'success');
            } else {
                this.showToast(data.message || 'Invalid OTP', 'error');
                this.otpInput.value = '';
                this.otpInput.focus();
            }
        } catch (error) {
            console.error('Verify OTP error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
            this.verifyOtpBtn.disabled = false;
        }
    }

    async handleResendOtp() {
        try {
            this.showLoading(true);
            this.resendOtpBtn.disabled = true;
            
            const response = await fetch(`${this.apiBaseUrl}/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: this.currentPhone })
            });

            const data = await response.json();

            if (data.success) {
                this.startCountdown();
                this.showToast('OTP resent successfully!', 'success');
                this.otpInput.value = '';
                this.otpInput.focus();
            } else {
                this.showToast(data.message || 'Failed to resend OTP', 'error');
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    handleLogout() {
        localStorage.removeItem('authToken');
        this.currentPhone = '';
        this.otpInput.value = '';
        this.phoneInput.value = '';
        this.stopCountdown();
        this.showScreen('login-screen');
        this.showToast('Logged out successfully', 'info');
    }

    async fetchUserInfo(token) {
        const response = await fetch(`${this.apiBaseUrl}/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        return data.user;
    }

    showScreen(screenName) {
        // Hide all screens
        this.loginScreen.classList.remove('active');
        this.otpScreen.classList.remove('active');
        this.dashboardScreen.classList.remove('active');
        
        // Show target screen
        document.getElementById(screenName).classList.add('active');
        this.currentScreen = screenName;
    }

    showOtpScreen() {
        this.phoneDisplay.textContent = this.formatPhoneDisplay(this.currentPhone);
        this.showScreen('otp-screen');
        this.otpInput.focus();
    }

    showDashboard(user) {
        this.userPhone.textContent = this.formatPhoneDisplay(user.phone);
        this.lastLogin.textContent = new Date(user.lastLogin).toLocaleString();
        this.accountCreated.textContent = new Date(user.createdAt).toLocaleString();
        this.showScreen('dashboard-screen');
    }

    formatPhoneDisplay(phone) {
        // Format phone for display (e.g., +1 (234) 567-890)
        return phone.replace(/(\+\d{1})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
    }

    startCountdown() {
        let timeLeft = 60;
        this.resendOtpBtn.disabled = true;
        this.timerElement.style.display = 'block';
        
        this.stopCountdown();
        
        this.countdownInterval = setInterval(() => {
            timeLeft--;
            this.countdownElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                this.stopCountdown();
                this.resendOtpBtn.disabled = false;
                this.timerElement.style.display = 'none';
            }
        }, 1000);
    }

    stopCountdown() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    showLoading(show) {
        if (show) {
            this.loadingSpinner.classList.remove('hidden');
        } else {
            this.loadingSpinner.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.remove('hidden');
        
        setTimeout(() => {
            this.toast.classList.add('hidden');
        }, 5000);
    }

    validatePhone(phone) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phone);
    }

    validateOtp(otp) {
        const otpRegex = /^\d{6}$/;
        return otpRegex.test(otp);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OTPLoginApp();
});