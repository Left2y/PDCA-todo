# 🎙️ PDCA Todo: 语音驱动的个人效率硬件工位

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Technology: Next.js 15](https://img.shields.io/badge/Tech-Next.js%2015-black?logo=next.js)](https://nextjs.org/)
[![Design: Industrial Hardware](https://img.shields.io/badge/Design-Industrial%20Hardware-orange)](https://teenage.engineering/)

> **将口语构思转化为标准的 PDCA 事项卡。**
> 这不仅仅是一个待办事项应用，而是一个被封装在软件中的“个人效率硬件工位”。深受 Teenage Engineering 工业美学启发，致力于提供极致的触觉反馈与视觉享受。

---

## 📽️ 视觉概览

![Today Overview](file:///C:/Users/Administrator/.gemini/antigravity/brain/48d23888-48ec-45a5-a610-60df0dd003e9/uploaded_image_0_1769322204681.png)
*精致的硬件质感：LCD 点阵显示屏、发光 LED 指示灯、模拟旋钮与切边按钮。*

---

## 🌟 核心特性

### 1. 🎙️ 语音驱动工作流 (Voice-to-Card)
无需繁琐打字。只需按下红色的 **REC** 实体质感按钮，通过口语描述你的一天。
- **智能转写**：集成阿里云百炼 ASR（Paraformer-Realtime）服务。
- **AI 自动建模**：利用大语言模型（通义千问）自动解析你的口语，将其拆解为标准的 **MUST (强制执行)** 与 **SHOULD (建议执行)** 任务块。

### 2. 📟 极致模拟硬件美学 (Hardware Aesthetic)
我们将 UI 设计推向了极致：
- **LCD 点阵屏**：实时显示日期与状态，复刻 80 年代经典电子仪器。
- **PDCA 实体卡片**：每一项任务都是一张高质感的“电路卡”，带有状态指示 LED 和序列编号。
- **双通道逻辑**：模仿调音台的 **CHANNEL A (MUST)** 与 **CHANNEL B (SHOULD)** 逻辑。

### 3. 🗓️ 全方位规划系统
- **今日清单 [TODAY]**：快速生成并管理当日核心 PDCA。
- **周计划 [WEEK]**：纵览本周宏观目标，保持节奏。
- **历史记录 [LOGS]**：精美的卡片式历史存档，点击即可回顾过去的执行细节。

### 4. 📂 数据主权与便携性
- **本地存储**：数据全流程掌握在用户手中。
- **PWA 深度适配**：支持 iOS/Android 添加到主屏幕，无边框全屏体验，流畅如原生应用。
- **Docker 容器化**：一键部署于群晖、威联通等 NAS 设备，随时私有化同步。

---

## 🚀 快速上手

### 1. 安装环境
- Node.js 18+
- [阿里云百炼 API Key](https://bailian.console.aliyun.com/)

### 2. 部署运行
```bash
# 获取源码
git clone https://github.com/Left2y/PDCA-todo.git
cd PDCA-todo

# 安装依赖
npm install

# 启动开发环境
npm run dev
```

### 3. 系统配置
1. 点击导航栏中的 **[SETTING]**。
2. 填入你的 `API Key`。
3. 选择您偏好的大模型（默认为 qwen-max）。

---

## 🛠️ 技术规格

| 模块 | 选型 |
| :--- | :--- |
| **前端框架** | Next.js 15 (App Router), React 19, TypeScript |
| **设计系统** | Vanilla CSS (High Fidelity Industrial Design) |
| **数据库** | SQLite (via `better-sqlite3`) |
| **AI 引擎** | 阿里云百炼 (ASR: Paraformer / LLM: Qwen) |
| **部署模式** | Standalone / Docker Compose |

---

## 📄 LICENSE

基于 **MIT License** 开源。保持简洁，保持专注。

---

> [!TIP]
> **设计哲学**：我们相信，好的生产力工具应该像一件昂贵的硬件乐器：它不仅要好用，更要让你在每一次点击、每一次操作时都感到审美上的愉悦。
