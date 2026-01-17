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

// Helper to get role from URL
function getCurrentRole() {
    const path = window.location.pathname;
    const roleSlug = path.split('/')[2]; // /login/planner/ -> planner
    const roleMap = {
        'planner': 'PLANNER',
        'farmer': 'AGRICULTURIST',
        'health': 'HEALTH',
        'resident': 'CITIZEN'
    };
    return roleMap[roleSlug] || 'CITIZEN';
}

// Login Logic
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        // Visual feedback
        submitBtn.innerHTML = '<span class="material-icons-sharp" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">sync</span> Authenticating...';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';

        try {
            const res = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: email, password: password })
            });

            // Debug: Check if response is ok
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server Error (${res.status}): ${text.substring(0, 100)}...`);
            }

            const data = await res.json();

            if (data.user) { // Check for success through user object presence or similar
                // Success
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_token', data.token || 'session'); // Dummy or real

                submitBtn.innerHTML = '<span class="material-icons-sharp" style="vertical-align: middle; margin-right: 8px;">check_circle</span> Sync Successful';
                submitBtn.style.background = '#10b981';

                setTimeout(() => {
                    window.location.href = '/'; // Go to Dashboard
                }, 800);
            } else {
                // Failure
                throw new Error(data.error || 'Login Failed');
            }
        } catch (err) {
            console.error(err);
            submitBtn.innerHTML = 'Login Failed';
            submitBtn.style.background = '#ef4444';
            setTimeout(() => {
                submitBtn.innerHTML = 'Login';
                submitBtn.style.background = '';
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                alert(err.message);
            }, 2000);
        }
    });
}

// Signup Logic
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const name = signupForm.querySelector('input[type="text"]').value;
        const email = signupForm.querySelector('input[type="email"]').value;
        const password = signupForm.querySelector('input[type="password"]').value;
        const role = getCurrentRole();

        // Feedback
        submitBtn.innerHTML = '<span class="material-icons-sharp" style="animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px;">hub</span> Establishing Neural Port...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/auth/signup/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: name, // Using name as username
                    email: email,
                    password: password,
                    role: role
                })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_token', 'session');

                submitBtn.innerHTML = 'Identity Established';
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                // Failure
                // Check if error is object (validation errors)
                let errorMsg = 'Signup Failed';
                if (typeof data === 'object') {
                    errorMsg = Object.values(data).flat().join('\n');
                }
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error(err);
            submitBtn.innerHTML = 'Failed';
            submitBtn.style.background = '#ef4444';
            setTimeout(() => {
                submitBtn.innerHTML = 'Establish Access';
                submitBtn.style.background = '';
                submitBtn.disabled = false;
                alert(err.message);
            }, 2000);
        }
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
