const container = document.getElementById('main-container');
const toSignup = document.getElementById('to-signup');
const toLogin = document.getElementById('to-login');
const themeToggler = document.querySelector('.theme-toggler');

// Toggle Switch Logic
if (toSignup) {
    toSignup.addEventListener('click', () => {
        container.classList.add('slide-up');
    });
}

if (toLogin) {
    toLogin.addEventListener('click', () => {
        container.classList.remove('slide-up');
    });
}

// Login Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;

        // Visual feedback
        submitBtn.innerHTML = '<span class="material-icons-sharp" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">sync</span> Authenticating...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        // Store login state
        localStorage.setItem('isLoggedIn', 'true');

        // Cinematic simulation
        setTimeout(() => {
            submitBtn.innerHTML = '<span class="material-icons-sharp" style="vertical-align: middle; margin-right: 8px;">check_circle</span> Sync Successful';
            submitBtn.style.background = '#10b981';

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        }, 1500);
    });
}

// Signup Logic
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = signupForm.querySelector('button[type="submit"]');

        // AI Terminology feedback
        submitBtn.innerHTML = '<span class="material-icons-sharp" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">hub</span> Establishing Neural Port...';
        submitBtn.disabled = true;

        setTimeout(() => {
            alert('Neural Identity established successfully! Initializing synchronization protocols.');
            container.classList.remove('slide-up');
            submitBtn.innerHTML = 'Identity Established';
            submitBtn.disabled = false;
        }, 1500);
    });
}

// Unified Theme Toggler
if (themeToggler) {
    themeToggler.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme-variables');
        themeToggler.querySelectorAll('span').forEach(span => span.classList.toggle('active'));

        const isDark = document.body.classList.contains('dark-theme-variables');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Initial Theme Check
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme-variables');
    if (themeToggler) {
        themeToggler.querySelector('span:nth-child(1)').classList.remove('active');
        themeToggler.querySelector('span:nth-child(2)').classList.add('active');
    }
}

// Add global spin animation for the sync icon
const spinStyle = document.createElement('style');
spinStyle.innerHTML = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinStyle);
