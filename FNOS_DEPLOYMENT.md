# PDCA 语音事项卡 - fnOS (飞牛NAS) 部署指南

本指南将帮助您在 fnOS (飞牛NAS) 上通过 Docker 部署 PDCA 语音事项卡应用。

---

## 📋 前提条件

- fnOS 系统已安装并正常运行
- 已安装 Docker 或 Container Station 套件
- 拥有 NAS 的 SSH 访问权限（推荐）
- 阿里云百炼 API Key（用于语音转写和 AI 生成）

---

## 🚀 部署方式一：Docker Compose（推荐）

### 步骤 1：创建项目目录

```bash
# SSH 登录到您的 fnOS
ssh admin@<你的NAS_IP>

# 创建项目目录
mkdir -p /vol1/docker/pdca-todo
cd /vol1/docker/pdca-todo
```

### 步骤 2：创建 `docker-compose.yml`

```yaml
version: '3.8'

services:
  pdca-todo:
    image: node:20-alpine
    container_name: pdca-todo
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      # 持久化数据库
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/app.db
    command: sh -c "npm install && npm run build && npm start"
    restart: unless-stopped

    # 如果您已经构建了自定义镜像，可以替换上面的配置为：
    # image: your-registry/pdca-todo:latest
```

### 步骤 3：克隆代码并启动

```bash
# 克隆代码仓库
git clone https://gitee.com/left2y-project/pdca-todo.git .

# 创建数据目录
mkdir -p data

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 步骤 4：访问应用

在浏览器中访问：`http://<你的NAS_IP>:3000`

---

## 🐳 部署方式二：使用预构建 Dockerfile

如果您希望使用优化的生产镜像，可以使用项目自带的 Dockerfile。

### 步骤 1：构建镜像

```bash
cd /vol1/docker/pdca-todo

# 构建 Docker 镜像
docker build -t pdca-todo:latest -f docker/Dockerfile .
```

### 步骤 2：运行容器

```bash
docker run -d \
  --name pdca-todo \
  -p 3000:3000 \
  -v /vol1/docker/pdca-todo/data:/app/data \
  -e DATABASE_PATH=/app/data/app.db \
  --restart unless-stopped \
  pdca-todo:latest
```

---

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_PATH` | SQLite 数据库文件路径 | `/app/data/app.db` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 应用监听端口 | `3000` |

### 数据持久化

> [!IMPORTANT]
> **务必**将 `/app/data` 目录挂载到宿主机，否则容器重启后数据会丢失！

推荐的挂载路径：
- fnOS: `/vol1/docker/pdca-todo/data`
- 群晖: `/volume1/docker/pdca-todo/data`

---

## 🔐 配置 API Key

首次访问应用后，点击右下角的 **⚙️ 设置** 按钮，配置您的阿里云百炼 API Key：

1. **API Key**: 从 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 获取
2. **Base URL**: `https://dashscope.aliyuncs.com/compatible-mode/v1`（默认值）
3. **ASR 模型**: `paraformer-realtime-v2`（语音识别）
4. **LLM 模型**: `qwen-plus`（AI 生成）

---

## 🌐 配置反向代理（可选）

如果您希望通过域名或 HTTPS 访问，可以配置 fnOS 内置的反向代理。

### 使用 fnOS Web Station

1. 打开 fnOS 控制面板 → **Web Station**
2. 创建新的虚拟主机
3. 设置域名（例如：`pdca.your-domain.com`）
4. 反向代理目标：`http://127.0.0.1:3000`

### 使用 Nginx Proxy Manager

```yaml
# docker-compose.yml 追加 Nginx Proxy Manager
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    ports:
      - "80:80"
      - "443:443"
      - "81:81"  # Admin UI
    volumes:
      - ./npm/data:/data
      - ./npm/letsencrypt:/etc/letsencrypt
```

---

## 🔧 常见问题排查

### 问题 1：容器启动失败

```bash
# 查看容器日志
docker logs pdca-todo

# 常见原因：
# 1. 端口被占用 → 更换端口映射
# 2. 数据目录权限问题 → chmod 777 data
```

### 问题 2：数据库初始化失败

```bash
# 检查数据目录是否存在且可写
ls -la /vol1/docker/pdca-todo/data

# 手动创建数据目录并设置权限
mkdir -p /vol1/docker/pdca-todo/data
chmod 755 /vol1/docker/pdca-todo/data
```

### 问题 3：语音录制无法使用

**原因**：麦克风 API 需要 HTTPS 环境或 localhost。

**解决方案**：
1. 使用 `https://` 访问（需配置 SSL 证书）
2. 或在浏览器中将 NAS IP 添加为"安全来源"

Chrome 设置方法：
1. 访问 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 添加 `http://<你的NAS_IP>:3000`
3. 重启浏览器

---

## 📦 更新应用

```bash
cd /vol1/docker/pdca-todo

# 拉取最新代码
git pull origin master

# 重新构建并启动
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 资源占用

| 指标 | 预估值 |
|------|--------|
| 内存 | ~200-300MB |
| CPU | 低（主要在 AI 请求时短暂升高） |
| 磁盘 | ~500MB（含 node_modules） |

---

## 🔗 相关链接

- **GitHub**: https://github.com/Left2y/PDCA-todo
- **Gitee**: https://gitee.com/left2y-project/pdca-todo
- **阿里云百炼**: https://bailian.console.aliyun.com/

---

> 如有问题，欢迎在 GitHub/Gitee 提交 Issue！
