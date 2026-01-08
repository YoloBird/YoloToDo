/**
 * 统一错误处理中间件
 */

/**
 * 异步路由包装器 - 自动捕获异步错误
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 处理
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({ error: '资源不存在' });
}

/**
 * 全局错误处理
 */
function errorHandler(err, req, res, next) {
    // 打印错误日志
    console.error(`[${new Date().toISOString()}] Error:`, err.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    // 确定状态码
    const status = err.status || err.statusCode || 500;

    // 返回错误响应
    res.status(status).json({
        error: err.message || '服务器内部错误',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

module.exports = {
    asyncHandler,
    notFoundHandler,
    errorHandler
};
