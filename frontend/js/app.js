    // Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global State
let currentUser = null;
let currentRole = null;
let departmentsList = [];

console.log('✅ App.js loaded successfully');

// Helper: Setup time input auto-formatting (HH:MM)
function setupTimeInputs() {
  const timeInputs = document.querySelectorAll('#shift-type-start, #shift-type-end');
  timeInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/[^\d]/g, ''); // เอาเฉพาะตัวเลข
      if (value.length >= 2) {
        value = value.substring(0, 2) + ':' + value.substring(2, 4);
      }
      e.target.value = value.substring(0, 5); // จำกัด HH:MM
    });
    
    input.addEventListener('blur', (e) => {
      let value = e.target.value.replace(/[^\d]/g, '');
      if (value.length === 4) {
        e.target.value = value.substring(0, 2) + ':' + value.substring(2, 4);
      }
    });
  });
}

// Helper: Setup modal keyboard shortcuts
function setupModalKeyboardShortcuts(modal, saveCallback, closeCallback) {
  // Remove old listener if exists
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
  }
  
  // Create and store handler
  modal._keydownHandler = (e) => {
    // Check if modal is active
    if (!modal.classList.contains('active')) return;
    
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveCallback();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCallback();
    }
  };
  
  // Add to document so it always receives events
  document.addEventListener('keydown', modal._keydownHandler);
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ DOMContentLoaded event fired');
  setupEventListeners();
  checkAuthStatus();
  // Preload departments for dropdowns
  await loadDepartments();
});

function setupEventListeners() {
  console.log('Setting up event listeners...');
  
  // Navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => showPage(e.target.dataset.page));
  });

  // Auth buttons
  document.getElementById('login-btn')?.addEventListener('click', openLoginModal);
  document.getElementById('signup-btn')?.addEventListener('click', openSignupModal);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Leave Request
  document.getElementById('btn-save-leave')?.addEventListener('click', submitLeaveRequest);

  // Attendance (old form)
  document.getElementById('btn-save-attendance')?.addEventListener('click', submitAttendance);
  
  // Check-in/Check-out (new camera system)
  setupAttendanceListeners();

  // Reports
  document.getElementById('btn-generate-report')?.addEventListener('click', generateReport);
  
  // Shifts - listen for date filter changes
  document.getElementById('shift-filter-date')?.addEventListener('change', loadShiftsData);
  
  console.log('✅ Event listeners setup complete');
}

// Auth Functions
async function checkAuthStatus() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    currentUser = JSON.parse(user);
    setupUserUI();
    await loadUserData();
  }
}

function openLoginModal() {
  console.log('Opening login modal...');
  const modal = document.getElementById('login-modal');
  console.log('Modal element:', modal);
  if (modal) {
    modal.classList.add('active');
    console.log('Modal opened, classes:', modal.className);
    
    // Setup keyboard shortcuts
    setupModalKeyboardShortcuts(modal, handleLogin, closeLoginModal);
    
    // Auto-focus first input
    setTimeout(() => {
      document.getElementById('login-username').focus();
    }, 100);
  } else {
    console.error('login-modal element not found!');
  }
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

async function openSignupModal() {
  const modal = document.getElementById('signup-modal');
  modal.classList.add('active');
  
  // Load departments from database first
  await loadDepartments();
  
  // Populate department dropdown dynamically
  populateDepartmentSelect('signup-department');
  
  // Setup keyboard shortcuts
  setupModalKeyboardShortcuts(modal, handleSignup, closeSignupModal);
  
  // Auto-focus first input
  setTimeout(() => {
    document.getElementById('signup-first-name').focus();
  }, 100);
}

function closeSignupModal() {
  const modal = document.getElementById('signup-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  document.getElementById('signup-first-name').value = '';
  document.getElementById('signup-last-name').value = '';
  document.getElementById('signup-nickname').value = '';
  document.getElementById('signup-email').value = '';
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-password').value = '';
  document.getElementById('signup-department').value = '';
  document.getElementById('signup-position').value = '';
}

async function handleSignup() {
  const firstName = document.getElementById('signup-first-name').value.trim();
  const lastName = document.getElementById('signup-last-name').value.trim();
  const nickname = document.getElementById('signup-nickname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const department = document.getElementById('signup-department').value;
  const position = document.getElementById('signup-position').value.trim();

  if (!firstName || !lastName || !email || !username || !password || !department || !position) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่จำเป็น');
    return;
  }

  if (password.length < 6) {
    showAlert('warning', 'Password ไม่ถูกต้อง', 'Password ต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }

  const fullname = `${firstName} ${lastName}`.trim();

  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        fullname,
        nickname,
        email,
        username,
        password,
        department,
        position,
        start_date: new Date().toISOString().split('T')[0]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'สมัครสมาชิกล้มเหลว', data.message || 'ไม่สามารถสมัครได้');
      return;
    }

    closeSignupModal();
    showAlert('success', 'สมัครสมาชิกสำเร็จ', 'สามารถเข้าสู่ระบบได้แล้ว');
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

// ===== Departments (Dynamic) =====
async function loadDepartments() {
  try {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE_URL}/departments`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!resp.ok) return;
    const data = await resp.json();
    departmentsList = data.departments || [];
    // Populate common dropdowns if they exist
    populateDepartmentSelect('emp-department');
    populateDepartmentSelect('signup-department');
    populateDepartmentSelect('inspect-department');
    populateDepartmentSelect('my-profile-department');
  } catch (err) {
    console.warn('loadDepartments error:', err.message);
  }
}

function populateDepartmentSelect(selectId, selectedValue = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  if (departmentsList && departmentsList.length > 0) {
    const options = departmentsList.map(dep => `<option value="${dep}">${dep}</option>`).join('');
    sel.innerHTML = '<option value="">-- เลือกแผนก --</option>' + options;
  }
  if (selectedValue) sel.value = selectedValue;
}

async function createDepartment() {
  const { value: name } = await Swal.fire({
    title: '➕ สร้างแผนก',
    input: 'text',
    inputLabel: 'ชื่อแผนก',
    inputPlaceholder: 'เช่น Sales, IT, HR',
    confirmButtonColor: '#d81b60',
    showCancelButton: true,
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value || !value.trim()) return 'กรุณากรอกชื่อแผนก';
    }
  });
  if (!name) return;
  try {
    const token = localStorage.getItem('token');
    const resp = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });
    const data = await resp.json();
    if (!resp.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message || 'ไม่สามารถสร้างแผนกได้');
      return;
    }
    await loadDepartments();
    renderDepartmentsTable(); // 🔄 Refresh ตารางทันที
    populateDepartmentSelect('emp-department', name);
    showAlert('success', 'สำเร็จ', 'สร้างแผนกเรียบร้อย');
  } catch (err) {
    showAlert('error', 'เกิดข้อผิดพลาด', err.message);
  }
}

async function handleLogin() {
  console.log('🔐 handleLogin called at', new Date().toLocaleTimeString());
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');
  
  console.log('Form elements found:', {
    username: loginUsername ? '✓' : '✗',
    password: loginPassword ? '✓' : '✗'
  });
  
  const username = loginUsername?.value?.trim() || '';
  const password = loginPassword?.value || '';

  console.log('Input values:', {
    username: username.length > 0 ? `${username.length} chars` : 'empty',
    password: password.length > 0 ? `${password.length} chars` : 'empty'
  });

  if (!username || !password) {
    console.warn('Missing username or password');
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอก Username และ Password');
    return;
  }

  try {
    console.log(`🚀 Attempting login with username: ${username}`);
    console.log(`📡 API URL: ${API_BASE_URL}/auth/login`);
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    console.log('✅ Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: {
        contentType: response.headers.get('content-type')
      }
    });
    
    const data = await response.json();
    console.log('📦 Response data:', data);

    if (!response.ok) {
      console.error('❌ Login failed with status', response.status, ':', data.message);
      showAlert('error', 'เข้าสู่ระบบล้มเหลว', data.message);
      return;
    }

    console.log('✅ Login successful, storing user data...');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    
    console.log('🔄 Closing modal and updating UI...');
    closeLoginModal();
    setupUserUI();
    
    console.log('📥 Loading user data...');
    await loadUserData();
    
    console.log('✅ All done!');
    showAlert('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${currentUser.fullname}`);
  } catch (error) {
    console.error('❌ Login error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  location.reload();
}

function setupUserUI() {
  document.getElementById('login-btn').style.display = 'none';
  document.getElementById('logout-btn').style.display = 'block';
  document.getElementById('user-info').classList.add('active');
  document.getElementById('current-user').textContent = currentUser.fullname;
  document.getElementById('current-role').textContent = getRoleDisplay(currentUser.role);
  
  setupNavigation();
}

function setupNavigation() {
  const navContainer = document.getElementById('nav-tabs');
  navContainer.innerHTML = '';

  const tabs = getTabs();
  
  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.className = 'nav-tab';
    button.textContent = tab.label;
    button.dataset.page = tab.page;
    button.addEventListener('click', () => showPage(tab.page));
    navContainer.appendChild(button);
  });

  showPage('attendance');
}

function getTabs() {
  const baseTabs = [
    { page: 'leave-request', label: '📝 ขอลางาน' },
    { page: 'attendance', label: '📋 การมาทำงาน' },
    { page: 'calendar', label: '📅 ปฏิทิน' },
    { page: 'profile', label: '📇 Profile' }
  ];

  if (currentUser?.role === 'admin' || currentUser?.role === 'hr') {
    baseTabs.push(
      { page: 'admin', label: '👥 จัดการพนักงาน' },
      { page: 'reports', label: '📊 รายงาน' }
    );
  }

  return baseTabs;
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  const page = document.getElementById(`page-${pageName}`);
  const tab = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.dataset.page === pageName);
  
  if (page) {
    page.classList.add('active');
    if (tab) tab.classList.add('active');
    
    // Load data based on page
    if (pageName === 'admin') {
      loadAdminData();
      loadShiftsData();
    } else if (pageName === 'attendance') {
      loadAttendancePage();
    }
  }
}

// Attendance Functions
async function submitAttendance() {
  const date = document.getElementById('attendance-date').value;
  const time = document.getElementById('attendance-time').value;
  const location = document.getElementById('attendance-location').value;
  const note = document.getElementById('attendance-note').value;

  if (!date || !time) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกวันที่และเวลา');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        employee_id: currentUser.id,
        date,
        time,
        location,
        note
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message);
      return;
    }

    showAlert('success', 'บันทึกสำเร็จ', 'บันทึกการมาทำงานเสร็จแล้ว');
    clearAttendanceForm();
    await loadAttendanceData();
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function loadAttendanceData() {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance?employee_id=${currentUser.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    const table = document.getElementById('attendance-table');

    if (!data.records || data.records.length === 0) {
      table.innerHTML = '<tr><td colspan="4" class="empty-state">ไม่มีข้อมูล</td></tr>';
      return;
    }

    table.innerHTML = data.records.map(record => `
      <tr>
        <td>${record.date}</td>
        <td>${record.time}</td>
        <td>${record.location || '-'}</td>
        <td>${record.note || '-'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading attendance:', error);
  }
}

function clearAttendanceForm() {
  document.getElementById('attendance-date').value = '';
  document.getElementById('attendance-time').value = '';
  document.getElementById('attendance-location').value = '';
  document.getElementById('attendance-note').value = '';
}

// Leave Request Functions
async function submitLeaveRequest() {
  const dateFrom = document.getElementById('leave-date-from').value;
  const dateTo = document.getElementById('leave-date-to').value;
  const type = document.getElementById('leave-type').value;
  const note = document.getElementById('leave-note').value;

  if (!dateFrom || !dateTo) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกวันที่');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/leave-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        employee_id: currentUser.id,
        date_from: dateFrom,
        date_to: dateTo,
        leave_type: type,
        reason: note
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message);
      return;
    }

    showAlert('success', 'ส่งคำขอสำเร็จ', 'รอการอนุมัติจากผู้บังคับบัญชา');
    clearLeaveForm();
    await loadMyLeaveRequests();
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function loadMyLeaveRequests() {
  try {
    const response = await fetch(`${API_BASE_URL}/leave-requests?employee_id=${currentUser.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    const table = document.getElementById('my-leave-table');

    if (!data.records || data.records.length === 0) {
      table.innerHTML = '<tr><td colspan="4" class="empty-state">ไม่มีรายการ</td></tr>';
      return;
    }

    table.innerHTML = data.records.map(record => `
      <tr>
        <td>${record.date_from} ถึง ${record.date_to}</td>
        <td>${record.leave_type}</td>
        <td>${record.reason || '-'}</td>
        <td><span class="status-badge status-${record.status}">${record.status}</span></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading leave requests:', error);
  }
}

function clearLeaveForm() {
  document.getElementById('leave-date-from').value = '';
  document.getElementById('leave-date-to').value = '';
  document.getElementById('leave-note').value = '';
}

// Profile Functions
async function loadProfileData() {
  try {
    const response = await fetch(`${API_BASE_URL}/employees/${currentUser.id}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    const emp = data.employee;

    document.getElementById('profile-fullname').value = emp.fullname;
    document.getElementById('profile-department').value = emp.department;
    document.getElementById('profile-position').value = emp.position;
    document.getElementById('profile-startdate').value = emp.start_date;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function openMyProfileEditModal() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees/${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลส่วนตัว');
      return;
    }

    const data = await response.json();
    const employee = data.employee;

    // Fill form with employee's own data
    document.getElementById('my-profile-first-name').value = employee.first_name || '';
    document.getElementById('my-profile-last-name').value = employee.last_name || '';
    document.getElementById('my-profile-nickname').value = employee.nickname || '';
    document.getElementById('my-profile-email').value = employee.email || '';
    document.getElementById('my-profile-phone').value = employee.phone || '';
    populateDepartmentSelect('my-profile-department', employee.department || '');
    document.getElementById('my-profile-position').value = employee.position || '';
    document.getElementById('my-profile-date-of-birth').value = employee.date_of_birth || '';
    document.getElementById('my-profile-address').value = employee.address || '';
    document.getElementById('my-profile-emergency-name').value = employee.emergency_contact_name || '';
    document.getElementById('my-profile-emergency-relationship').value = employee.emergency_contact_relationship || '';
    document.getElementById('my-profile-emergency-phone').value = employee.emergency_contact_phone || '';

    const modal = document.getElementById('my-profile-edit-modal');
    modal.classList.add('active');
    
    // Setup keyboard shortcuts
    setupModalKeyboardShortcuts(modal, saveMyProfileEdit, closeMyProfileEditModal);
    
    // Auto-focus first input
    setTimeout(() => {
      document.getElementById('my-profile-first-name').focus();
    }, 100);
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function saveMyProfileEdit() {
  try {
    const token = localStorage.getItem('token');
    const updateData = {
      first_name: document.getElementById('my-profile-first-name').value.trim(),
      last_name: document.getElementById('my-profile-last-name').value.trim(),
      fullname: (document.getElementById('my-profile-first-name').value + ' ' + document.getElementById('my-profile-last-name').value).trim(),
      nickname: document.getElementById('my-profile-nickname').value.trim(),
      email: document.getElementById('my-profile-email').value.trim(),
      phone: document.getElementById('my-profile-phone').value.trim(),
      department: document.getElementById('my-profile-department').value,
      position: document.getElementById('my-profile-position').value.trim(),
      date_of_birth: document.getElementById('my-profile-date-of-birth').value,
      address: document.getElementById('my-profile-address').value.trim(),
      emergency_contact_name: document.getElementById('my-profile-emergency-name').value.trim(),
      emergency_contact_relationship: document.getElementById('my-profile-emergency-relationship').value.trim(),
      emergency_contact_phone: document.getElementById('my-profile-emergency-phone').value.trim()
    };

    if (!updateData.first_name || !updateData.last_name || !updateData.email) {
      showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกชื่อจริง นามสกุล และ Email');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/employees/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'บันทึกล้มเหลว', data.message || 'ไม่สามารถบันทึกข้อมูล');
      return;
    }

    showAlert('success', 'บันทึกสำเร็จ', 'ข้อมูลส่วนตัวของคุณได้ถูกอัพเดต');
    
    // Update stored user data
    currentUser.fullname = updateData.fullname;
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    closeMyProfileEditModal();
    await loadProfileData(); // Refresh profile display
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

function closeMyProfileEditModal() {
  const modal = document.getElementById('my-profile-edit-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  // Clear form
  document.getElementById('my-profile-first-name').value = '';
  document.getElementById('my-profile-last-name').value = '';
  document.getElementById('my-profile-nickname').value = '';
  document.getElementById('my-profile-email').value = '';
  document.getElementById('my-profile-phone').value = '';
  document.getElementById('my-profile-department').value = '';
  document.getElementById('my-profile-position').value = '';
  document.getElementById('my-profile-date-of-birth').value = '';
  document.getElementById('my-profile-address').value = '';
  document.getElementById('my-profile-emergency-name').value = '';
  document.getElementById('my-profile-emergency-relationship').value = '';
  document.getElementById('my-profile-emergency-phone').value = '';
}

// Reports Functions
async function generateReport() {
  const from = document.getElementById('report-from').value;
  const to = document.getElementById('report-to').value;
  const type = document.getElementById('report-type').value;

  if (!from || !to) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณาเลือกช่วงวันที่');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/reports/${type}?date_from=${from}&date_to=${to}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const data = await response.json();
    
    displayReportData(data, type);
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

function displayReportData(data, type) {
  const resultDiv = document.getElementById('report-result');
  
  if (!data.records || data.records.length === 0) {
    resultDiv.style.display = 'none';
    showAlert('info', 'ไม่พบข้อมูล', 'ไม่มีข้อมูลในช่วงที่เลือก');
    return;
  }

  // Setup headers based on report type
  const headers = getReportHeaders(type);
  const headerRow = document.getElementById('report-headers');
  headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

  // Setup data rows
  const dataBody = document.getElementById('report-data');
  dataBody.innerHTML = data.records.map(record => {
    const row = headers.map(h => {
      const key = h.toLowerCase().replace(/\s+/g, '_');
      return `<td>${record[key] || '-'}</td>`;
    }).join('');
    return `<tr>${row}</tr>`;
  }).join('');

  resultDiv.style.display = 'block';
}

function getReportHeaders(type) {
  const headers = {
    attendance: ['ชื่อ', 'วันที่', 'เวลา', 'สถานที่'],
    leave: ['ชื่อ', 'ประเภท', 'วันที่', 'สถานะ'],
    payroll: ['ชื่อ', 'เดือน', 'เงินเดือน', 'หัก', 'เงินสด']
  };
  return headers[type] || [];
}

// Admin Functions
function openAddEmployeeModal() {
  const modal = document.getElementById('add-employee-modal');
  modal.classList.add('active');
  
  // Populate department dropdown dynamically
  populateDepartmentSelect('emp-department');
  
  // Setup keyboard shortcuts
  setupModalKeyboardShortcuts(modal, addEmployee, closeAddEmployeeModal);
  
  // Auto-focus first input
  setTimeout(() => {
    document.getElementById('emp-fullname').focus();
  }, 100);
}

function closeAddEmployeeModal() {
  const modal = document.getElementById('add-employee-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  document.getElementById('emp-fullname').value = '';
  document.getElementById('emp-email').value = '';
  document.getElementById('emp-username').value = '';
  document.getElementById('emp-password').value = '';
  document.getElementById('emp-department').value = '';
  document.getElementById('emp-position').value = '';
  document.getElementById('emp-role').value = 'employee';
}

async function saveEmployee() {
  const fullname = document.getElementById('emp-fullname').value.trim();
  const email = document.getElementById('emp-email').value.trim();
  const username = document.getElementById('emp-username').value.trim();
  const password = document.getElementById('emp-password').value;
  const department = document.getElementById('emp-department').value;
  const position = document.getElementById('emp-position').value.trim();
  const role = document.getElementById('emp-role').value;

  if (!fullname || !email || !username || !password || !department || !position) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลทั้งหมด');
    return;
  }

  if (password.length < 6) {
    showAlert('warning', 'Password ไม่ถูกต้อง', 'Password ต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fullname,
        email,
        username,
        password,
        department,
        position,
        role,
        start_date: new Date().toISOString().split('T')[0]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'เพิ่มพนักงานล้มเหลว', data.message || 'ไม่สามารถเพิ่มพนักงานได้');
      return;
    }

    closeAddEmployeeModal();
    showAlert('success', 'เพิ่มพนักงานสำเร็จ', `${fullname} ถูกเพิ่มเข้าในระบบ`);
    await loadAdminData(); // Refresh employee list
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

// Admin global variables
let allEmployeesData = [];

async function loadAdminData() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return;

    const data = await response.json();
    allEmployeesData = data.employees || [];
    
    // Load team filter options
    loadTeamFilter();
    
    // Display all employees
    displayEmployeeTable(allEmployeesData);
  } catch (error) {
    console.error('Error loading admin data:', error);
  }
}

function loadTeamFilter() {
  // Get unique departments
  const teams = [...new Set(allEmployeesData.map(emp => emp.department).filter(Boolean))];
  const select = document.getElementById('admin-team-filter');
  
  if (select) {
    const options = teams.map(team => 
      `<option value="${team}">${team}</option>`
    ).join('');
    select.innerHTML = '<option value="">-- ทั้งหมด --</option>' + options;
  }
}

function filterEmployeesByTeam() {
  const selectedTeam = document.getElementById('admin-team-filter')?.value || '';
  
  if (selectedTeam) {
    const filtered = allEmployeesData.filter(emp => emp.department === selectedTeam);
    displayEmployeeTable(filtered);
  } else {
    displayEmployeeTable(allEmployeesData);
  }
}

function displayEmployeeTable(employees) {
  const tableBody = document.getElementById('admin-employee-table');

  if (!employees || employees.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="2" class="empty-state">ยังไม่มีข้อมูล</td></tr>';
    return;
  }

  tableBody.innerHTML = employees.map(emp => `
    <tr>
      <td><a href="#" onclick="openInspectEmployeeModal(${emp.id}); return false;" style="color: #d81b60; cursor: pointer; text-decoration: none; font-weight: 500;">${emp.fullname}</a></td>
      <td>${emp.department || '-'}</td>
    </tr>
  `).join('');
}

let currentInspectingEmployeeId = null;
let isEditingEmployee = false;

async function openInspectEmployeeModal(employeeId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลพนักงาน');
      return;
    }

    const data = await response.json();
    const employee = data.employee;
    currentInspectingEmployeeId = employeeId;
    isEditingEmployee = false;

    // Fill form with employee data
    document.getElementById('inspect-first-name').value = employee.first_name || '';
    document.getElementById('inspect-last-name').value = employee.last_name || '';
    document.getElementById('inspect-nickname').value = employee.nickname || '';
    document.getElementById('inspect-email').value = employee.email || '';
    document.getElementById('inspect-phone').value = employee.phone || '';
    document.getElementById('inspect-username').value = employee.username || '';
    document.getElementById('inspect-password').value = '(ไม่แสดง)';
    populateDepartmentSelect('inspect-department', employee.department || '');
    document.getElementById('inspect-position').value = employee.position || '';
    document.getElementById('inspect-date-of-birth').value = employee.date_of_birth || '';
    document.getElementById('inspect-address').value = employee.address || '';
    document.getElementById('inspect-emergency-name').value = employee.emergency_contact_name || '';
    document.getElementById('inspect-emergency-relationship').value = employee.emergency_contact_relationship || '';
    document.getElementById('inspect-emergency-phone').value = employee.emergency_contact_phone || '';
    document.getElementById('inspect-start-date').value = employee.start_date || '';
    document.getElementById('inspect-role').value = employee.role || 'employee';
    document.getElementById('inspect-status').value = employee.status || 'active';

    // Set form to view mode
    setInspectFormViewMode();

    const modal = document.getElementById('inspect-employee-modal');
    modal.classList.add('active');
    
    // Setup keyboard shortcuts (Esc to close, no Enter save since it's view mode initially)
    setupModalKeyboardShortcuts(modal, null, closeInspectEmployeeModal);
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

function setInspectFormViewMode() {
  isEditingEmployee = false;
  const inputs = document.querySelectorAll('#inspect-employee-modal input, #inspect-employee-modal select, #inspect-employee-modal textarea');
  inputs.forEach(input => {
    input.disabled = true;
  });

  document.getElementById('btn-edit-employee').style.display = 'inline-block';
  document.getElementById('btn-save-inspect').style.display = 'none';
}

function editEmployee() {
  isEditingEmployee = true;
  const inputs = document.querySelectorAll('#inspect-employee-modal input, #inspect-employee-modal select, #inspect-employee-modal textarea');
  inputs.forEach(input => {
    if (input.id !== 'inspect-username' && input.id !== 'inspect-password') {
      input.disabled = false;
    }
  });

  document.getElementById('btn-edit-employee').style.display = 'none';
  document.getElementById('btn-save-inspect').style.display = 'inline-block';
  
  // Update keyboard shortcuts to include save
  const modal = document.getElementById('inspect-employee-modal');
  setupModalKeyboardShortcuts(modal, saveEmployeeInspection, closeInspectEmployeeModal);
  
  // Focus first editable input
  setTimeout(() => {
    document.getElementById('inspect-first-name').focus();
  }, 100);
}

async function saveEmployeeInspection() {
  if (!currentInspectingEmployeeId) return;

  try {
    const token = localStorage.getItem('token');
    const updateData = {
      first_name: document.getElementById('inspect-first-name').value.trim(),
      last_name: document.getElementById('inspect-last-name').value.trim(),
      fullname: (document.getElementById('inspect-first-name').value + ' ' + document.getElementById('inspect-last-name').value).trim(),
      nickname: document.getElementById('inspect-nickname').value.trim(),
      email: document.getElementById('inspect-email').value.trim(),
      phone: document.getElementById('inspect-phone').value.trim(),
      department: document.getElementById('inspect-department').value,
      position: document.getElementById('inspect-position').value.trim(),
      date_of_birth: document.getElementById('inspect-date-of-birth').value,
      address: document.getElementById('inspect-address').value.trim(),
      emergency_contact_name: document.getElementById('inspect-emergency-name').value.trim(),
      emergency_contact_relationship: document.getElementById('inspect-emergency-relationship').value.trim(),
      emergency_contact_phone: document.getElementById('inspect-emergency-phone').value.trim(),
      start_date: document.getElementById('inspect-start-date').value,
      role: document.getElementById('inspect-role').value,
      status: document.getElementById('inspect-status').value
    };

    if (!updateData.first_name || !updateData.last_name || !updateData.email || !updateData.department) {
      showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลที่จำเป็น');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/employees/${currentInspectingEmployeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    if (!response.ok) {
      showAlert('error', 'บันทึกล้มเหลว', data.message || 'ไม่สามารถบันทึกข้อมูล');
      return;
    }

    showAlert('success', 'บันทึกสำเร็จ', 'ข้อมูลพนักงานได้ถูกอัพเดต');
    closeInspectEmployeeModal();
    await loadAdminData(); // Refresh employee list
  } catch (error) {
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

function closeInspectEmployeeModal() {
  const modal = document.getElementById('inspect-employee-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  currentInspectingEmployeeId = null;
  isEditingEmployee = false;
  setInspectFormViewMode();
}

async function deleteEmployee(id) {
  Swal.fire({
    title: 'ลบพนักงาน',
    text: 'คุณแน่ใจหรือที่จะลบพนักงานรายนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d81b60',
    cancelButtonColor: '#999',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          showAlert('error', 'ลบล้มเหลว', 'ไม่สามารถลบพนักงานได้');
          return;
        }

        showAlert('success', 'ลบสำเร็จ', 'พนักงานถูกลบออกจากระบบ');
        await loadAdminData();
      } catch (error) {
        showAlert('error', 'เกิดข้อผิดพลาด', error.message);
      }
    }
  });
}

// User Data Functions
async function loadUserData() {
  await loadMyLeaveRequests();
  await loadAttendanceData();
  await loadProfileData();
  await loadCalendarEmployees();
  await loadCalendarData();
}

// Calendar Variables
let currentCalendarMonth = new Date();
let shiftsCache = [];
let calendarAttendances = [];
let selectedCalendarEmployee = null;

async function loadCalendarEmployees() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return;

    const data = await response.json();
    const select = document.getElementById('calendar-employee-select');
    
    if (select) {
      // For employees, only show themselves
      if (currentUser.role === 'employee') {
        const currentUserEmployee = data.employees.find(emp => emp.id === currentUser.id);
        if (currentUserEmployee) {
          select.innerHTML = `<option value="${currentUserEmployee.id}">${currentUserEmployee.fullname}</option>`;
          select.value = currentUserEmployee.id;
          selectedCalendarEmployee = currentUserEmployee.id;
        }
      } else {
        // For admin/hr, show all employees
        const options = data.employees.map(emp => 
          `<option value="${emp.id}">${emp.fullname}</option>`
        ).join('');
        
        select.innerHTML = '<option value="">-- ทั้งหมด --</option>' + options;
      }
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

async function loadCalendarData() {
  try {
    const token = localStorage.getItem('token');
    
    // Get selected employee from dropdown
    const select = document.getElementById('calendar-employee-select');
    const selectedValue = select ? select.value : '';
    
    // For employees, always use their own ID; for admin/hr, use selected or all
    if (currentUser.role === 'employee') {
      selectedCalendarEmployee = currentUser.id;
    } else {
      selectedCalendarEmployee = selectedValue ? parseInt(selectedValue) : null;
    }
    
    console.log('Loading calendar data for employee:', selectedCalendarEmployee || 'All');
    
    // Load holidays if employee selected
    if (selectedCalendarEmployee) {
      const holidaysResponse = await fetch(`${API_BASE_URL}/holidays?employee_id=${selectedCalendarEmployee}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (holidaysResponse.ok) {
        const holidaysData = await holidaysResponse.json();
        allHolidaysData = holidaysData.holidays || [];
        console.log('Holidays loaded:', allHolidaysData);
      }
    } else {
      allHolidaysData = [];
    }
    
    // Build URL with filters
    let url = `${API_BASE_URL}/shifts`;
    const params = [];
    
    if (selectedCalendarEmployee) {
      params.push(`employee_id=${selectedCalendarEmployee}`);
    }
    
    // Add date range filter for selected calendar month
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    
    params.push(`start_date=${startDate}`);
    params.push(`end_date=${endDate}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log('Fetching shifts from:', url);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      console.warn('Failed to load shifts');
      return;
    }

    const data = await response.json();
    console.log('Shifts loaded:', data.shifts?.length || 0);
    
    // Store shifts as array (for date range queries)
    shiftsCache = data.shifts || [];
    console.log('Shifts cache updated:', shiftsCache);

    // Load attendance data for the calendar month
    await loadCalendarAttendances(startDate, endDate);

    renderCalendar();
  } catch (error) {
    console.error('Error loading calendar data:', error);
  }
}

async function loadCalendarAttendances(startDate, endDate) {
  try {
    const token = localStorage.getItem('token');
    let attendanceUrl = `${API_BASE_URL}/attendance?start_date=${startDate}&end_date=${endDate}`;
    
    if (selectedCalendarEmployee) {
      attendanceUrl += `&employee_id=${selectedCalendarEmployee}`;
    }
    
    const response = await fetch(attendanceUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      calendarAttendances = data.attendance || [];
      console.log('Calendar attendances loaded:', calendarAttendances.length);
    } else {
      calendarAttendances = [];
    }
  } catch (error) {
    console.error('Error loading calendar attendances:', error);
    calendarAttendances = [];
  }
}

function renderCalendar() {
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  
  // Update title
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  document.getElementById('calendar-month-title').textContent = `${monthNames[month]} ${year + 543}`;
  
  // Get first day and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let html = '';
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day" style="background: #f5f5f5; min-height: 100px;"></div>';
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check for shifts that contain this date (date range overlap)
    const shiftsForDay = shiftsCache.filter(shift => {
      const shiftStart = new Date(shift.start_date);
      const shiftEnd = new Date(shift.end_date);
      const currentDay = new Date(year, month, day);
      return currentDay >= shiftStart && currentDay <= shiftEnd;
    });
    
    // Check for attendance on this day
    const attendancesForDay = calendarAttendances.filter(att => {
      // Compare date strings directly (backend now returns YYYY-MM-DD)
      return att.date === dateStr;
    });
    
    // Check for holidays on this day of week
    // แสดงวันหยุดเฉพาะถ้ามีกะทำงานอยู่ในช่วงเดียวกัน
    const dayOfWeek = new Date(year, month, day).getDay();
    const holidays = selectedCalendarEmployee && shiftsForDay.length > 0 ? 
      allHolidaysData.filter(h => h.employee_id === selectedCalendarEmployee && h.week_day === dayOfWeek) : [];
    
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const dayStyle = isToday ? 'background: #fff3e0; border: 2px solid #ff9800;' : 'background: white;';
    
    // If there's a holiday, show only holiday (don't show shifts)
    let cellContent = '';
    if (holidays.length > 0) {
      cellContent = '<div class="shift-box" style="font-size: 11px; padding: 2px 4px; margin: 2px 0; background: #ffd54f; border-radius: 4px; color: #f57f17;"><strong>🎉 หยุด</strong></div>';
    } else {
      // Show shifts only if not a holiday
      cellContent = shiftsForDay.map(shift => {
        // Shorten name for mobile
        const shortName = shift.shift_name ? shift.shift_name.substring(0, 10) : 'กะ';
        const empName = shift.employee_name ? shift.employee_name.substring(0, 8) : '';
        return `
        <div class="shift-box" style="font-size: 11px; padding: 2px 4px; margin: 2px 0; background: #e1bee7; border-radius: 4px; color: #6a1b9a;">
          <strong>${shortName}</strong>
          <div>${shift.shift_start.substring(0, 5)}-${shift.shift_end.substring(0, 5)}</div>
          ${!selectedCalendarEmployee && empName ? `<div style="color: #555; font-size: 9px;">${empName}</div>` : ''}
        </div>
      `;
      }).join('');
      
      // Add attendance info if exists
      if (attendancesForDay.length > 0) {
        cellContent += attendancesForDay.map(att => {
          const checkInTime = att.checkin_time ? att.checkin_time.substring(0, 5) : '-';
          const checkOutTime = att.checkout_time ? att.checkout_time.substring(0, 5) : '-';
          const statusColor = att.checkout_time ? '#4caf50' : '#ff9800';
          const statusIcon = att.checkout_time ? '✅' : '🔵';
          const empName = att.employee_name ? att.employee_name.substring(0, 6) : '';
          
          return `
            <div class="attendance-box" style="font-size: 10px; padding: 2px 4px; margin: 2px 0; background: ${statusColor}; border-radius: 4px; color: white;">
              ${statusIcon} ${checkInTime}${att.checkout_time ? '-' + checkOutTime : ''}
              ${!selectedCalendarEmployee && empName ? `<div style="font-size: 8px;">${empName}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }
    
    html += `
      <div class="calendar-day" style="${dayStyle} padding: 8px; min-height: 100px; border: 1px solid #e0e0e0; overflow-y: auto;">
        <div class="calendar-day-number" style="font-weight: bold; color: #d81b60; margin-bottom: 4px;">${day}</div>
        <div class="calendar-cell-content" style="font-size: 12px;">${cellContent}</div>
      </div>
    `;
  }
  
  document.getElementById('calendar-grid').innerHTML = html;
}

function prevMonth() {
  currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1);
  loadCalendarData();
}

function nextMonth() {
  currentCalendarMonth = new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1);
  loadCalendarData();
}

function getRoleDisplay(role) {
  const roles = {
    'admin': 'ผู้ดูแลระบบ',
    'hr': 'ฝ่ายบุคคล',
    'manager': 'ผู้บริหาร',
    'employee': 'พนักงาน'
  };
  return roles[role] || 'ผู้ใช้';
}

// Alert Helper Function
function showAlert(type, title, message) {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: title,
      text: message,
      icon: type,
      confirmButtonColor: '#d81b60'
    });
  } else {
    alert(`${title}\n${message}`);
  }
}

// Admin Tabs
function switchAdminTab(tab) {
  const employeesSection = document.getElementById('admin-employees-section');
  const shiftsSection = document.getElementById('admin-shifts-section');
  const settingsSection = document.getElementById('admin-shift-settings-section');
  const departmentsSection = document.getElementById('admin-departments-section');
  const employeesBtn = document.getElementById('tab-employees');
  const shiftsBtn = document.getElementById('tab-shifts');
  const settingsBtn = document.getElementById('tab-shift-settings');
  const departmentsBtn = document.getElementById('tab-departments');

  // Hide all sections
  employeesSection.style.display = 'none';
  shiftsSection.style.display = 'none';
  settingsSection.style.display = 'none';
  if (departmentsSection) departmentsSection.style.display = 'none';
  
  // Reset all button styles
  employeesBtn.style.borderColor = 'transparent';
  employeesBtn.style.color = '#999';
  shiftsBtn.style.borderColor = 'transparent';
  shiftsBtn.style.color = '#999';
  settingsBtn.style.borderColor = 'transparent';
  settingsBtn.style.color = '#999';
  if (departmentsBtn) { departmentsBtn.style.borderColor = 'transparent'; departmentsBtn.style.color = '#999'; }

  if (tab === 'employees') {
    employeesSection.style.display = 'block';
    employeesBtn.style.borderColor = '#d81b60';
    employeesBtn.style.color = '#d81b60';
  } else if (tab === 'shifts') {
    shiftsSection.style.display = 'block';
    shiftsBtn.style.borderColor = '#d81b60';
    shiftsBtn.style.color = '#d81b60';
    loadShiftsData();
  } else if (tab === 'shift-settings') {
    settingsSection.style.display = 'block';
    settingsBtn.style.borderColor = '#d81b60';
    settingsBtn.style.color = '#d81b60';
    loadShiftTypes();
  } else if (tab === 'departments') {
    if (departmentsSection) {
      departmentsSection.style.display = 'block';
      if (departmentsBtn) { departmentsBtn.style.borderColor = '#d81b60'; departmentsBtn.style.color = '#d81b60'; }
      awaitDepartmentsTab();
    }
  }
}

async function awaitDepartmentsTab() {
  // Hide create button for non-admin
  const btn = document.getElementById('btn-create-department');
  if (btn) btn.style.display = (currentUser?.role === 'admin') ? 'inline-block' : 'none';
  await loadDepartments();
  renderDepartmentsTable();
}

function renderDepartmentsTable() {
  const tbody = document.getElementById('admin-departments-table');
  if (!tbody) return;
  if (!departmentsList || departmentsList.length === 0) {
    tbody.innerHTML = '<tr><td class="empty-state">ยังไม่มีข้อมูล</td></tr>';
    return;
  }
  tbody.innerHTML = departmentsList.map(name => `<tr><td>${name}</td></tr>`).join('');
}
// Shift Management
let currentShiftId = null;
let shiftTemplates = [];
let allShiftsData = [];
let allHolidaysData = [];

async function loadShiftsData() {
  try {
    console.log('Loading shifts data...');
    const token = localStorage.getItem('token');
    
    const url = `${API_BASE_URL}/shifts`;

    console.log('Fetching from:', url);
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      console.error('Response not ok:', response.status);
      return;
    }

    const data = await response.json();
    console.log('Shifts data:', data);
    allShiftsData = data.shifts || [];
    
    // Load team filter options
    loadShiftTeamFilter();
    
    // Display shifts
    displayShiftsTable(allShiftsData);
  } catch (error) {
    console.error('Error loading shifts:', error);
  }
}

function loadShiftTeamFilter() {
  // Get unique teams from employees
  const teams = new Set();
  console.log('All shifts data:', allShiftsData);
  
  allShiftsData.forEach(shift => {
    console.log('Shift:', shift, 'Team:', shift.team);
    if (shift.team) teams.add(shift.team);
  });
  
  console.log('Unique teams:', Array.from(teams));
  
  const select = document.getElementById('shift-filter-team');
  console.log('Filter select element:', select);
  
  if (select) {
    const teamsArray = Array.from(teams).sort();
    console.log('Teams array:', teamsArray);
    
    const options = teamsArray.map(team => 
      `<option value="${team}">${team}</option>`
    ).join('');
    
    select.innerHTML = '<option value="">-- ทั้งหมด --</option>' + options;
    console.log('Filter dropdown populated with teams:', teamsArray);
  } else {
    console.error('shift-filter-team element not found');
  }
}

function filterShiftsByTeam() {
  console.log('Filter changed, redisplaying shifts');
  displayShiftsTable(allShiftsData);
}

function displayShiftsTable(shifts) {
  const tableBody = document.getElementById('admin-shifts-table');
  
  // Get selected team filter
  const filterSelect = document.getElementById('shift-filter-team');
  const selectedTeam = filterSelect ? filterSelect.value : '';
  console.log('Displaying shifts. Selected team filter:', selectedTeam);
  console.log('Total shifts available:', shifts.length);
  console.log('Shifts:', shifts);
  
  // Filter shifts by team if selected
  let filteredShifts = shifts;
  if (selectedTeam) {
    console.log('Filtering by team:', selectedTeam);
    filteredShifts = shifts.filter(shift => {
      console.log('Comparing shift team:', shift.team, 'with selected:', selectedTeam, 'match:', shift.team === selectedTeam);
      return shift.team === selectedTeam;
    });
    console.log('Filtered shifts count:', filteredShifts.length);
  }

  if (!filteredShifts || filteredShifts.length === 0) {
    console.log('No shifts found - displaying empty state');
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">ยังไม่มีข้อมูล</td></tr>';
    return;
  }

  console.log('Rendering shifts:', filteredShifts.length);
  tableBody.innerHTML = filteredShifts.map(shift => `
    <tr>
      <td>${shift.employee_name || 'ไม่ระบุ'}</td>
      <td>${shift.shift_name || '-'}</td>
      <td>${shift.team || '-'}</td>
      <td>
        <button class="btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="deleteShift(${shift.id})">🗑️ ลบ</button>
      </td>
    </tr>
  `).join('');
}

async function loadShiftEmployees() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return;

    const data = await response.json();
    const select = document.getElementById('shift-employee');
    
    // For employees, only show themselves; for admin/hr, show all employees
    if (currentUser.role === 'employee') {
      const currentUserEmployee = data.employees.find(emp => emp.id === currentUser.id);
      if (currentUserEmployee) {
        select.innerHTML = `<option value="${currentUserEmployee.id}">${currentUserEmployee.fullname}</option>`;
        select.value = currentUserEmployee.id;
      }
    } else {
      const options = data.employees.map(emp => 
        `<option value="${emp.id}">${emp.fullname}</option>`
      ).join('');
      
      select.innerHTML = '<option value="">-- เลือกพนักงาน --</option>' + options;
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

async function loadShiftTypes() {
  try {
    console.log('Loading shift templates...');
    const token = localStorage.getItem('token');
    
    // Load from new API endpoint
    const response = await fetch(`${API_BASE_URL}/shift-templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.error('Failed to load templates:', response.status);
      shiftTemplates = [];
      return;
    }
    
    const data = await response.json();
    shiftTemplates = data.templates || [];
    console.log('Shift templates loaded:', shiftTemplates);
    
    renderShiftTypes();
  } catch (error) {
    console.error('Error loading shift templates:', error);
    shiftTemplates = [];
  }
}

function renderShiftTypes() {
  const tableBody = document.getElementById('admin-shift-types-table');
  
  if (!shiftTemplates || shiftTemplates.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">ยังไม่มีข้อมูล</td></tr>';
    return;
  }

  tableBody.innerHTML = shiftTemplates.map(template => `
    <tr>
      <td>${template.shift_name}</td>
      <td>${template.shift_start}</td>
      <td>${template.shift_end}</td>
      <td>
        <button class="btn-small" onclick="editShiftType(${template.id})">✏️</button>
        <button class="btn-small" onclick="deleteShiftType(${template.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
  
  // Also update shift-type dropdown in shift form
  const select = document.getElementById('shift-type');
  if (select) {
    const options = shiftTemplates.map(template => 
      `<option value="${template.id}">${template.shift_name} (${template.shift_start}-${template.shift_end})</option>`
    ).join('');
    select.innerHTML = '<option value="">-- เลือกแบบกะ --</option>' + options;
  }
}

function openAddShiftModal() {
  console.log('Opening add shift modal...');
  currentShiftId = null;
  document.getElementById('shift-modal-title').textContent = '➕ เพิ่มกะงาน';
  document.getElementById('shift-employee').value = '';
  document.getElementById('shift-start-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('shift-end-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('shift-type').value = '';
  document.getElementById('shift-note').value = '';
  
  loadShiftEmployees();
  const modal = document.getElementById('add-shift-modal');
  console.log('Modal element:', modal);
  modal.classList.add('active');
  console.log('Modal opened');
  
  // Setup keyboard shortcuts
  setupModalKeyboardShortcuts(modal, saveShift, closeAddShiftModal);
  
  // Auto-focus first input
  setTimeout(() => {
    document.getElementById('shift-employee').focus();
  }, 100);
}

function closeAddShiftModal() {
  const modal = document.getElementById('add-shift-modal');
  modal.classList.remove('active');
  
  // Remove keyboard shortcuts
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
  
  // Clear holiday checkboxes
  document.querySelectorAll('.shift-holiday-checkbox').forEach(cb => cb.checked = false);
}

function openAddShiftTypeModal() {
  console.log('Opening add shift type modal...');
  document.getElementById('shift-type-name').value = '';
  document.getElementById('shift-type-start').value = '';
  document.getElementById('shift-type-end').value = '';
  
  const modal = document.getElementById('add-shift-type-modal');
  modal.classList.add('active');
  
  // Setup time input auto-formatting
  setupTimeInputs();
  
  // Setup keyboard shortcuts
  setupModalKeyboardShortcuts(modal, saveShiftType, closeAddShiftTypeModal);
  
  // Focus first input for keyboard navigation
  setTimeout(() => {
    document.getElementById('shift-type-name').focus();
  }, 100);
}

function closeAddShiftTypeModal() {
  const modal = document.getElementById('add-shift-type-modal');
  modal.classList.remove('active');
  
  // Remove keyboard listener
  if (modal._keydownHandler) {
    document.removeEventListener('keydown', modal._keydownHandler);
    modal._keydownHandler = null;
  }
}

async function saveShift() {
  console.log('Saving shift...');
  const employeeId = document.getElementById('shift-employee').value;
  const startDate = document.getElementById('shift-start-date').value;
  const endDate = document.getElementById('shift-end-date').value;
  const shiftTypeId = document.getElementById('shift-type').value;
  const note = document.getElementById('shift-note').value;

  // Get selected holidays
  const selectedHolidays = Array.from(document.querySelectorAll('.shift-holiday-checkbox:checked'))
    .map(cb => parseInt(cb.value));

  console.log('Form data:', { employeeId, startDate, endDate, shiftTypeId, note, selectedHolidays });

  if (!employeeId || !startDate || !endDate || !shiftTypeId) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอก: พนักงาน, วันที่เริ่ม, วันที่ออก, ชื่อกะ');
    return;
  }

  // Check for conflicting shifts (same employee, same date range)
  if (!currentShiftId) {
    const conflictingShift = shiftsCache[startDate]?.find(shift => 
      parseInt(shift.employee_id) === parseInt(employeeId)
    );
    
    if (conflictingShift) {
      Swal.fire({
        title: '⚠️ เตือน: กะซ้อน',
        html: `<p>พนักงานคนนี้มีกะอยู่แล้วในวันที่นี้</p>
               <p><strong>กะเดิม:</strong> ${conflictingShift.shift_name} (${conflictingShift.shift_start} - ${conflictingShift.shift_end})</p>
               <p style="color: #d81b60;"><strong>หากดำเนินการต่อ จะทับกะเดิม</strong></p>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d81b60',
        cancelButtonColor: '#999',
        confirmButtonText: 'ทับ (ยืนยัน)',
        cancelButtonText: 'ยกเลิก'
      }).then(async (result) => {
        if (result.isConfirmed) {
          await submitShiftSave(employeeId, startDate, endDate, shiftTypeId, note, selectedHolidays);
        }
      });
      return;
    }
  }

  await submitShiftSave(employeeId, startDate, endDate, shiftTypeId, note, selectedHolidays);
}

async function submitShiftSave(employeeId, startDate, endDate, shiftTypeId, note, selectedHolidays) {
  try {
    const token = localStorage.getItem('token');
    const method = currentShiftId ? 'PUT' : 'POST';
    const url = currentShiftId ? `${API_BASE_URL}/shifts/${currentShiftId}` : `${API_BASE_URL}/shifts`;

    console.log('Sending to:', url, 'Method:', method);
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        employee_id: parseInt(employeeId),
        shift_id: parseInt(shiftTypeId),
        start_date: startDate,
        end_date: endDate,
        note: note,
        holidays: selectedHolidays
      })
    });

    const data = await response.json();
    console.log('Response:', data);

    if (!response.ok) {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message);
      return;
    }

    closeAddShiftModal();
    loadShiftsData();
    loadCalendarData();
    showAlert('success', 'สำเร็จ', currentShiftId ? 'แก้ไขกะงานสำเร็จ' : 'เพิ่มกะงานสำเร็จ');
  } catch (error) {
    console.error('Error saving shift:', error);
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function saveShiftType() {
  console.log('Saving shift template...');
  const name = document.getElementById('shift-type-name').value.trim();
  const startTime = document.getElementById('shift-type-start').value;
  const endTime = document.getElementById('shift-type-end').value;
  const description = document.getElementById('shift-type-description')?.value.trim() || '';

  if (!name || !startTime || !endTime) {
    showAlert('warning', 'ข้อมูลไม่ครบ', 'กรุณากรอก: ชื่อกะ, เวลาเข้า, เวลาออก');
    return;
  }
  
  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    showAlert('warning', 'รูปแบบเวลาไม่ถูกต้อง', 'กรุณากรอกเวลาในรูปแบบ 00:00 - 23:59');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/shift-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        shift_name: name,
        shift_start: startTime,
        shift_end: endTime,
        description: description
      })
    });

    if (!response.ok) {
      const error = await response.json();
      showAlert('error', 'เกิดข้อผิดพลาด', error.message);
      return;
    }
    
    await loadShiftTypes();
    closeAddShiftTypeModal();
    showAlert('success', 'สำเร็จ', 'เพิ่มแบบกะสำเร็จ');
  } catch (error) {
    console.error('Error saving shift template:', error);
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function editShift(id) {
  showAlert('info', 'แก้ไข', 'กำลังพัฒนา');
}

async function editShiftType(id) {
  showAlert('info', 'แก้ไข', 'กำลังพัฒนา');
}

async function deleteShift(id) {
  Swal.fire({
    title: 'ลบกะงาน',
    text: 'คุณแน่ใจที่จะลบกะงานนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d81b60',
    cancelButtonColor: '#999',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/shifts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          loadShiftsData();
          showAlert('success', 'ลบสำเร็จ', 'ลบกะงานสำเร็จ');
        }
      } catch (error) {
        showAlert('error', 'เกิดข้อผิดพลาด', error.message);
      }
    }
  });
}

async function deleteShiftType(id) {
  Swal.fire({
    title: 'ลบแบบกะ',
    text: 'คุณแน่ใจที่จะลบแบบกะนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d81b60',
    cancelButtonColor: '#999',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/shift-templates/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const error = await response.json();
          showAlert('error', 'เกิดข้อผิดพลาด', error.message);
          return;
        }

        await loadShiftTypes();
        showAlert('success', 'ลบสำเร็จ', 'ลบแบบกะสำเร็จ');
      } catch (error) {
        showAlert('error', 'เกิดข้อผิดพลาด', error.message);
      }
    }
  });
}

async function deleteShift(shiftId) {
  Swal.fire({
    title: 'ยืนยันการลบ',
    text: 'คุณแน่ใจที่จะลบกะนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d81b60',
    cancelButtonColor: '#999',
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/shifts/${shiftId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error('Failed to delete shift');
        }

        loadShiftsData();
        showAlert('success', 'ลบสำเร็จ', 'ลบกะงานสำเร็จ');
      } catch (error) {
        showAlert('error', 'เกิดข้อผิดพลาด', error.message);
      }
    }
  });
}

// ===== Holidays Management =====

// ===== Check-in / Check-out (Attendance) =====
let cameraStream = null;
let currentPhotoData = null;
let todayAttendance = null;
let hasTodayShift = false;

function setupAttendanceListeners() {
  document.getElementById('btn-open-camera')?.addEventListener('click', openCamera);
  document.getElementById('btn-close-camera')?.addEventListener('click', closeCamera);
  document.getElementById('btn-take-photo')?.addEventListener('click', takePhoto);
  document.getElementById('btn-check-in')?.addEventListener('click', submitCheckIn);
  document.getElementById('btn-check-out')?.addEventListener('click', submitCheckOut);
}

async function openCamera() {
  try {
    console.log('Opening camera...');
    
    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };
    
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Camera stream obtained');
    
    const video = document.getElementById('camera-preview');
    video.srcObject = cameraStream;
    
    // Ensure video plays
    video.onloadedmetadata = () => {
      console.log('Video metadata loaded, playing...');
      video.play().catch(err => console.error('Play error:', err));
    };
    
    video.style.display = 'block';
    
    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('btn-open-camera').style.display = 'none';
    document.getElementById('btn-take-photo').style.display = 'inline-block';
    document.getElementById('btn-close-camera').style.display = 'inline-block';
    
    console.log('✅ Camera opened successfully');
  } catch (error) {
    console.error('Camera error:', error);
    showAlert('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถเปิดกล้องได้: ' + error.message);
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
  }
  
  const video = document.getElementById('camera-preview');
  video.style.display = 'none';
  document.getElementById('camera-placeholder').style.display = 'flex';
  document.getElementById('btn-open-camera').style.display = 'inline-block';
  document.getElementById('btn-take-photo').style.display = 'none';
  document.getElementById('btn-close-camera').style.display = 'none';
}

function takePhoto() {
  const video = document.getElementById('camera-preview');
  const canvas = document.getElementById('photo-canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  
  currentPhotoData = canvas.toDataURL('image/jpeg', 0.8);
  
  const photoPreview = document.getElementById('photo-preview');
  photoPreview.src = currentPhotoData;
  photoPreview.style.display = 'block';
  
  closeCamera();
  
  // Show check-in/out buttons
  updateCheckInOutButtons();
}

async function loadTodayAttendance() {
  try {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/attendance?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      todayAttendance = data.attendance?.[0] || null;
      updateCheckInOutButtons();
    }
  } catch (error) {
    console.error('Error loading today attendance:', error);
  }
}

async function loadTodayShift() {
  try {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    
    const response = await fetch(`${API_BASE_URL}/shifts?date=${today}&employee_id=${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const shift = data.shifts?.[0];
      
      const shiftInfoBox = document.getElementById('shift-info-box');
      if (shift) {
        document.getElementById('shift-info-name').textContent = shift.shift_name || '-';
        document.getElementById('shift-info-time').textContent = `${shift.shift_start.substring(0, 5)} - ${shift.shift_end.substring(0, 5)}`;
        shiftInfoBox.style.display = 'block';
        hasTodayShift = true;
        return true;
      } else {
        shiftInfoBox.style.display = 'none';
        hasTodayShift = false;
        return false;
      }
    }
    hasTodayShift = false;
    return false;
  } catch (error) {
    console.error('Error loading today shift:', error);
    hasTodayShift = false;
    return false;
  }
}

function updateCheckInOutButtons() {
  const hasPhoto = currentPhotoData !== null;
  
  console.log('Updating buttons - hasTodayShift:', hasTodayShift, 'hasPhoto:', hasPhoto, 'todayAttendance:', todayAttendance);
  
  if (!hasTodayShift) {
    document.getElementById('btn-check-in').style.display = 'none';
    document.getElementById('btn-check-out').style.display = 'none';
    return;
  }
  
  if (!todayAttendance) {
    // Haven't checked in yet
    document.getElementById('btn-check-in').style.display = hasPhoto ? 'inline-block' : 'none';
    document.getElementById('btn-check-out').style.display = 'none';
  } else if (todayAttendance && !todayAttendance.checkout_time) {
    // Already checked in, waiting for checkout
    document.getElementById('btn-check-in').style.display = 'none';
    document.getElementById('btn-check-out').style.display = hasPhoto ? 'inline-block' : 'none';
  } else {
    // Already checked out
    document.getElementById('btn-check-in').style.display = 'none';
    document.getElementById('btn-check-out').style.display = 'none';
  }
}

async function submitCheckIn() {
  try {
    console.log('submitCheckIn called');
    
    if (!hasTodayShift) {
      showAlert('error', 'ไม่มีกะงาน', 'ไม่มีกะจัดจำหน่ายในวันนี้ ไม่สามารถเช็คอินได้');
      return;
    }
    
    console.log('Submitting check-in...');
    
    // Get GPS location
    let locationStr = 'ไม่ทราบตำแหน่ง';
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        locationStr = `${lat}, ${lng}`;
        console.log('GPS location:', locationStr);
      }
    } catch (gpsError) {
      console.warn('GPS error:', gpsError);
      locationStr = 'ไม่อนุญาตตำแหน่ง';
    }
    
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        employee_id: currentUser.id,
        date: today,
        checkin_time: timeStr,
        location: locationStr
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', 'สำเร็จ', 'เช็คอินสำเร็จ เวลา ' + timeStr);
      currentPhotoData = null;
      document.getElementById('photo-preview').style.display = 'none';
      await loadTodayAttendance();
      loadAttendanceHistory();
    } else {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message);
    }
  } catch (error) {
    console.error('Error checking in:', error);
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function submitCheckOut() {
  try {
    const token = localStorage.getItem('token');
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    const response = await fetch(`${API_BASE_URL}/attendance/${todayAttendance.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        checkout_time: timeStr
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      showAlert('success', 'สำเร็จ', 'เช็คเอาต์สำเร็จ เวลา ' + timeStr);
      currentPhotoData = null;
      document.getElementById('photo-preview').style.display = 'none';
      await loadTodayAttendance();
      loadAttendanceHistory();
    } else {
      showAlert('error', 'เกิดข้อผิดพลาด', data.message);
    }
  } catch (error) {
    console.error('Error checking out:', error);
    showAlert('error', 'เกิดข้อผิดพลาด', error.message);
  }
}

async function loadAttendanceHistory() {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/attendance?employee_id=${currentUser.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.warn('Failed to load attendance');
      return;
    }
    
    const data = await response.json();
    const tbody = document.getElementById('attendance-table');
    
    if (!data.attendance || data.attendance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">ไม่มีข้อมูล</td></tr>';
      return;
    }
    
    let html = '';
    for (const record of data.attendance) {
      const checkinTime = record.checkin_time ? record.checkin_time.substring(0, 5) : '-';
      const checkoutTime = record.checkout_time ? record.checkout_time.substring(0, 5) : '-';
      
      // Format date to DD/MM/YYYY (Thai format)
      let displayDate = record.date;
      if (record.date) {
        const [year, month, day] = record.date.split('-');
        displayDate = `${day}/${month}/${year}`;
      }
      
      let hours = '-';
      if (record.checkin_time && record.checkout_time) {
        const [inH, inM] = record.checkin_time.split(':').map(Number);
        const [outH, outM] = record.checkout_time.split(':').map(Number);
        const duration = (outH - inH) + ((outM - inM) / 60);
        hours = duration.toFixed(1) + ' ชม.';
      }
      
      html += `
        <tr>
          <td>${displayDate}</td>
          <td>${checkinTime}</td>
          <td>${checkoutTime}</td>
          <td>${hours}</td>
          <td>${record.location || '-'}</td>
        </tr>
      `;
    }
    
    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error loading attendance history:', error);
  }
}

// Load attendance data when switching to attendance page
function loadAttendancePage() {
  loadTodayShift();
  loadTodayAttendance();
  loadAttendanceHistory();
}
