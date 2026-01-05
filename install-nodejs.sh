#!/bin/bash

echo "=========================================="
echo "正在安装 Node.js 到 WSL..."
echo "=========================================="
echo ""

# 下载并运行 NodeSource 安装脚本
echo "步骤 1/2: 添加 Node.js 仓库..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装 Node.js
echo ""
echo "步骤 2/2: 安装 Node.js..."
sudo apt-get install -y nodejs

# 验证安装
echo ""
echo "=========================================="
echo "安装完成！版本信息："
echo "=========================================="
node --version
npm --version

echo ""
echo "现在可以启动服务器了："
echo "  cd /home/pang/project/ToDo_List"
echo "  npm start"
