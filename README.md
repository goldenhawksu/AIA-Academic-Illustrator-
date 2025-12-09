# 🎨 AIA - 学术插图助手

[English](#english) | 中文

一个基于 AI 的学术图表自动生成工具，帮助研究人员快速创建 CVPR/NeurIPS 标准的学术插图。

> **纯前端应用** - 无需后端服务器，直接部署到 Vercel/Cloudflare Pages

![效果图](./screenshot.png)

## ✨ 功能特点

- 📄 **智能分析** - 支持文本输入和 PDF/图片上传
- 🔄 **浏览器端 PDF 转换** - PDF 自动转换为图片（使用 pdf.js）
- 🎯 **Schema 生成** - AI 自动生成结构化视觉蓝图
- 🖼️ **图像渲染** - 使用 AI 模型生成高质量学术图表
- 📎 **参考图片** - 可上传参考图片指导生成风格
- 🌍 **双语支持** - 中文/英文界面
- 💾 **本地存储** - 历史记录保存在浏览器
- 🔑 **BYOK 模式** - 自带 API Key，数据安全

## 🛠️ 技术栈

- **Next.js 15** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** + Shadcn/UI
- **Zustand** (状态管理)
- **PDF.js** (浏览器端 PDF 处理)
- **OpenAI SDK** (API 调用)

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/qwwzdyj/AIA-Academic-Illustrator-.git
cd AIA-Academic-Illustrator-/frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 配置 API

打开设置，配置您的 API：

| 模型 | 用途 | 推荐 |
|------|------|------|
| **逻辑模型** | 分析论文生成 Schema | gpt-4o / deepseek-chat |
| **视觉模型** | 生成学术图表 | gemini-2.0-flash-exp |

## 📖 使用流程

1. **Step 1 - 架构师**: 输入论文摘要或上传 PDF → 生成视觉蓝图
2. **Step 2 - 审阅**: 编辑优化 Schema，添加参考图片
3. **Step 3 - 渲染器**: 生成学术图表 → 下载保存

## 🌐 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qwwzdyj/AIA-Academic-Illustrator-)

**或手动部署**:

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
cd frontend
vercel
```

## 📄 许可证

MIT License

---

<a name="english"></a>
# 🎨 AIA - Academic Illustrator Agent

[中文](#) | English

An AI-powered academic diagram generation tool for researchers.

> **Pure Frontend App** - No backend server required, deploy directly to Vercel/Cloudflare Pages

![Screenshot](./screenshot.png)

## ✨ Features

- 📄 **Smart Analysis** - Text input + PDF/image upload
- 🔄 **Browser-side PDF Conversion** - PDF to images using pdf.js
- 🎯 **Schema Generation** - AI generates structured Visual Schema
- 🖼️ **Image Rendering** - High-quality academic diagrams
- 📎 **Reference Images** - Style guidance support
- 🌍 **Bilingual** - Chinese/English UI
- 💾 **Local Storage** - History saved in browser
- 🔑 **BYOK Mode** - Bring Your Own Key

## 🛠️ Tech Stack

- **Next.js 15** (App Router)
- **React 18** + TypeScript
- **Tailwind CSS** + Shadcn/UI
- **Zustand** (State Management)
- **PDF.js** (Browser PDF Processing)
- **OpenAI SDK** (API Calls)

## 🚀 Quick Start

```bash
git clone https://github.com/qwwzdyj/AIA-Academic-Illustrator-.git
cd AIA-Academic-Illustrator-/frontend
npm install
npm run dev
```

Visit http://localhost:3000

## 🌐 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qwwzdyj/AIA-Academic-Illustrator-)

## 📄 License

MIT License
