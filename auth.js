// ===== AUTH SYSTEM (localStorage-based) =====

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    if (tab === 'login') document.getElementById('loginForm').classList.add('active');
    if (tab === 'register') document.getElementById('registerForm').classList.add('active');
    if (tab === 'staff') document.getElementById('staffForm').classList.add('active');
}

// Auto-switch tab from URL
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('role') === 'staff') {
        switchTab('staff');
    }

    // Tab click handlers
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
});

// Register
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const firstName = document.getElementById('regFirstName').value;
        const lastName = document.getElementById('regLastName').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;

        if (password !== confirm) {
            alert('Passwords do not match!');
            return;
        }
        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        // Save user to localStorage
        const users = JSON.parse(localStorage.getItem('mm_users') || '[]');
        if (users.find(u => u.email === email)) {
            alert('A user with this email already exists.');
            return;
        }

        users.push({ firstName, lastName, email, phone, password, role: 'customer', createdAt: new Date().toISOString() });
        localStorage.setItem('mm_users', JSON.stringify(users));
        alert('Account created successfully! You can now sign in.');
        switchTab('login');
    });
}

// Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const users = JSON.parse(localStorage.getItem('mm_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            localStorage.setItem('mm_session', JSON.stringify({ ...user, loggedIn: true }));
            alert(`Welcome back, ${user.firstName}!`);
            window.location.href = 'index.html';
        } else {
            alert('Invalid email or password.');
        }
    });
}

// Staff Login
const staffForm = document.getElementById('staffForm');
if (staffForm) {
    staffForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const staffId = document.getElementById('staffId').value;
        const password = document.getElementById('staffPassword').value;

        // Default admin credentials + any stored staff
        const defaultStaff = [
            { id: 'admin', password: 'admin', name: 'Admin', role: 'admin' },
            { id: 'MM-001', password: 'staff123', name: 'Staff Member', role: 'staff' }
        ];

        const storedStaff = JSON.parse(localStorage.getItem('mm_staff') || '[]');
        const allStaff = [...defaultStaff, ...storedStaff];
        const staff = allStaff.find(s => s.id === staffId && s.password === password);

        if (staff) {
            localStorage.setItem('mm_session', JSON.stringify({ ...staff, loggedIn: true, isStaff: true }));
            window.location.href = 'dashboard.html';
        } else {
            alert('Invalid staff credentials. Please try again.');
        }
    });
}
