# PDCA Todo V1 部署指南

本项目已迁移至 Next.js，支持 SQLite 后端存储，适合在群晖 (Synology) 或其他支持 Docker 的 NAS 上部署。

## 部署方案：Docker Compose (推荐)

### 1. 准备工作
- 确保已安装 Docker 和 Docker Compose。
- 创建一个目录用于存放项目文件，例如 `pdca-todo`。
- 在该目录下创建一个 `data` 子目录用于持久化数据库：`mkdir data`。

### 2. 配置文件
将以下文件拷贝到你的部署目录：
- `docker-compose.yml`
- `docker/Dockerfile`
- 以及项目源代码。

### 3. 启动服务
在项目根目录下运行：
```bash
docker-compose up -d
```

### 4. 访问系统
- 默认端口为 `3000`。
- 如果需要远程访问或 PWA 功能（iOS A2HS 必须 HTTPS），建议配合 **Nginx Proxy Manager** 或 **群晖内置反向代理** 使用，并配置 SSL 证书。

## 手动部署 (Node.js)

1. 安装依赖：
   ```bash
   npm install
   ```
2. 构建项目：
   ```bash
   npm run build
   ```
3. 启动服务：
   ```bash
   npm run start
   ```

## 环境变量
| 变量名 | 描述 | 默认值 |
| :--- | :--- | :--- |
| `DATABASE_PATH` | SQLite 数据库文件路径 | `/data/app.db` |
| `PORT` | 运行端口 | `3000` |

## PWA 安装说明
1. 使用 Safari (iOS) 或 Chrome (Android/PC) 访问你的 HTTPS 域名。
2. iOS: 点击“分享”按钮 -> “添加到主屏幕”。
3. Android/PC: 浏览器会弹出安装提示，或在菜单中选择“安装应用”。
