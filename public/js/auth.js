/**
 * ========================================
 * 认证相关 JavaScript
 * 功能：用户登录
 * ========================================
 */

const API_URL = '/api';

// ==================== 登录功能 ====================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');

    // 清除之前的错误
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');

    // 验证输入
    if (!email || !password) {
        errorDiv.textContent = '请填写账号和密码';
        errorDiv.classList.add('show');
        return;
    }

    // 显示加载状态
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // 显示成功消息
            errorDiv.textContent = '登录成功，正在跳转...';
            errorDiv.classList.add('show');
            errorDiv.style.background = 'rgba(16, 185, 129, 0.1)';
            errorDiv.style.borderLeftColor = '#10b981';
            errorDiv.style.color = '#10b981';

            // 跳转到主页
            setTimeout(() => {
                window.location.href = '/app';
            }, 500);
        } else {
            // 显示错误信息
            errorDiv.textContent = data.error || '登录失败';
            errorDiv.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = '网络错误，请稍后重试';
        errorDiv.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

// ==================== 自动跳转 ====================
// 如果已经登录，直接跳转
if (localStorage.getItem('token')) {
    window.location.href = '/app';
}
