/**
 * API 调用模块
 */

const API_URL = '/api';

// ==================== Token 管理 ====================
let token = localStorage.getItem('token');

export function getToken() {
    return token;
}

export function setToken(newToken) {
    token = newToken;
    if (newToken) {
        localStorage.setItem('token', newToken);
    } else {
        localStorage.removeItem('token');
    }
}

export function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
        return {};
    }
}

export function setUser(user) {
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));
    } else {
        localStorage.removeItem('user');
    }
}

export function logout() {
    setToken(null);
    setUser(null);
    window.location.href = '/';
}

export function checkAuth() {
    if (!token) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// ==================== API 调用 ====================
export async function apiCall(endpoint, methodOrOptions = 'GET', data = null) {
    let options = {};

    // 支持两种调用方式:
    // 1. apiCall('/endpoint', { method: 'POST', body: JSON.stringify(data) })
    // 2. apiCall('/endpoint', 'POST', { data })
    if (typeof methodOrOptions === 'string') {
        options = { method: methodOrOptions };
        if (data) {
            options.body = JSON.stringify(data);
        }
    } else {
        options = methodOrOptions;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    // 未授权则跳转登录
    if (response.status === 401 || response.status === 403) {
        logout();
        return;
    }

    const result = await response.json();

    // HTTP 状态码非 2xx 抛出错误
    if (!response.ok) {
        const error = new Error(result.error || result.message || '请求失败');
        error.status = response.status;
        error.data = result;
        throw error;
    }

    return result;
}

// ==================== 文件下载 ====================
export async function downloadFile(endpoint, filename) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error('下载失败');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
