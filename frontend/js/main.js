const API_BASE_URL = 'http://127.0.0.1:5000/api';

// 工具函数
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function showError(message) {
    console.error('Error:', message);
    alert(message);
}

// 测试API连接
async function testApiConnection() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/test');
        const data = await response.json();
        console.log('API测试响应:', data);
        return true;
    } catch (error) {
        console.error('API连接测试失败:', error);
        return false;
    }
}

// API调用函数
async function login(username, password) {
    try {
        console.log('尝试登录:', username);
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        console.log('登录响应:', data);
        if (response.ok) {
            setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            return true;
        } else {
            showError(data.error);
            return false;
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        showError('登录失败,请检查网络连接');
        return false;
    }
}

async function register(username, password, confirmPassword, isExpert) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, confirmPassword, is_expert: isExpert }),
        });
        const data = await response.json();
        if (response.ok) {
            return true;
        } else {
            showError(data.error);
            return false;
        }
    } catch (error) {
        showError('注册失败,请稍后重试');
        return false;
    }
}

async function getThesisList(search = '', status = 'all') {
    try {
        const response = await fetch(`${API_BASE_URL}/thesis?search=${search}&status=${status}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
            },
        });
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            console.error('获取论文列表失败:', data);
            showError(data.error || '获取论文列表失败');
            return [];
        }
    } catch (error) {
        console.error('获取论文列表请求失败:', error);
        showError('获取论文列表失败,请检查网络连接');
        return [];
    }
}

async function submitThesis(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/thesis`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
            },
            body: formData,
        });
        const data = await response.json();
        if (response.ok) {
            return true;
        } else {
            showError(data.error);
            return false;
        }
    } catch (error) {
        showError('提交论文失败');
        return false;
    }
}

async function submitReview(thesisId, score, comments) {
    try {
        const response = await fetch(`${API_BASE_URL}/thesis/${thesisId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ score, comments }),
        });
        const data = await response.json();
        if (response.ok) {
            return true;
        } else {
            showError(data.error);
            return false;
        }
    } catch (error) {
        showError('提交评审失败');
        return false;
    }
}

async function getStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
            },
        });
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            console.error('获取统计数据失败:', data);
            showError(data.error || '获取统计数据失败');
            return null;
        }
    } catch (error) {
        console.error('获取统计数据请求失败:', error);
        showError('获取统计数据失败,请检查网络连接');
        return null;
    }
}

// UI更新函数
function updateNavigation() {
    const token = getToken();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    document.getElementById('loginNav').classList.toggle('d-none', !!token);
    document.getElementById('registerNav').classList.toggle('d-none', !!token);
    document.getElementById('logoutNav').classList.toggle('d-none', !token);
    
    // 更新统计信息
    if (token) {
        updateStats();
    }
}

async function updateStats() {
    const stats = await getStats();
    if (stats) {
        document.getElementById('totalThesis').textContent = stats.total_thesis;
        document.getElementById('completedReviews').textContent = stats.completed_reviews;
        document.getElementById('pendingReviews').textContent = stats.pending_reviews;
    }
}

function renderThesisList(thesisList) {
    const container = document.getElementById('thesisList');
    container.innerHTML = thesisList.map(thesis => `
        <div class="card thesis-card">
            <div class="card-header">
                <h5 class="card-title mb-0">${thesis.title}</h5>
            </div>
            <div class="card-body">
                <p class="card-text">${thesis.content}</p>
                <p class="card-text">
                    <small class="text-muted">
                        <i class="bi bi-person"></i> 作者: ${thesis.author} |
                        <i class="bi bi-clock"></i> 提交时间: ${new Date(thesis.created_at).toLocaleString()}
                    </small>
                </p>
                ${thesis.file_path ? `
                    <p class="card-text">
                        <a href="${API_BASE_URL}/uploads/${thesis.file_path}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-file-earmark"></i> 下载论文文件
                        </a>
                    </p>
                ` : ''}
                <p class="card-text">
                    <span class="badge ${thesis.status === 'completed' ? 'bg-success' : 'bg-warning'}">
                        ${thesis.status === 'completed' ? '已完成' : '待评审'}
                    </span>
                </p>
                ${thesis.status === 'completed' ? `
                    <p class="card-text">
                        <span class="score-badge">
                            <i class="bi bi-star-fill"></i> 平均分: ${thesis.average_score.toFixed(1)}
                        </span>
                    </p>
                    <h6><i class="bi bi-chat-square-text"></i> 评审意见:</h6>
                    ${thesis.reviews.map(review => `
                        <div class="review-item">
                            <p><i class="bi bi-person"></i> 评审人: ${review.reviewer}</p>
                            <p><i class="bi bi-star"></i> 分数: ${review.score}</p>
                            <p><i class="bi bi-chat"></i> 意见: ${review.comments}</p>
                            <small class="text-muted">
                                <i class="bi bi-clock"></i> ${new Date(review.created_at).toLocaleString()}
                            </small>
                        </div>
                    `).join('')}
                ` : `
                    <form class="review-form" onsubmit="handleReviewSubmit(event, ${thesis.id})">
                        <div class="mb-3">
                            <label class="form-label">评分 (0-100)</label>
                            <input type="number" class="form-control" name="score" min="0" max="100" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">评审意见</label>
                            <textarea class="form-control" name="comments" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-send"></i> 提交评审
                        </button>
                    </form>
                `}
            </div>
        </div>
    `).join('');
}

// 事件处理函数
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    
    if (await login(username, password)) {
        updateNavigation();
        loadThesisList();
        bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const username = form.username.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const isExpert = form.is_expert.checked;
    
    if (await register(username, password, confirmPassword, isExpert)) {
        bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
        showError('注册成功,请登录');
    }
}

async function handleThesisSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    if (await submitThesis(formData)) {
        bootstrap.Modal.getInstance(document.getElementById('submitThesisModal')).hide();
        loadThesisList();
        updateStats();
    }
}

async function handleReviewSubmit(event, thesisId) {
    event.preventDefault();
    const form = event.target;
    const score = parseInt(form.score.value);
    const comments = form.comments.value;
    
    if (await submitReview(thesisId, score, comments)) {
        loadThesisList();
        updateStats();
    }
}

function logout() {
    removeToken();
    localStorage.removeItem('user');
    updateNavigation();
    document.getElementById('thesisList').innerHTML = '';
}

async function loadThesisList() {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const thesisList = await getThesisList(search, status);
    renderThesisList(thesisList);
}

// 搜索和筛选功能
function setupSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadThesisList, 300);
    });
    
    statusFilter.addEventListener('change', loadThesisList);
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('页面加载完成,开始初始化...');
    
    // 测试API连接
    const apiConnected = await testApiConnection();
    if (!apiConnected) {
        showError('无法连接到后端服务器,请确保服务器正在运行');
        return;
    }
    
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('submitThesisForm').addEventListener('submit', handleThesisSubmit);
    
    setupSearchAndFilter();
    updateNavigation();
    
    if (getToken()) {
        loadThesisList();
    }
    
    console.log('初始化完成');
}); 