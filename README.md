# 🤖 AI Helpdesk

<div align="center">
    <img src="/resources/ai-helpdesk-example.png" alt="Example of AI Slack Helper">
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

<br>

An open-source desktop application that monitors your Slack channels and provides AI-assisted responses to IT requests, enhanced with user context from your documentation.

<div align="center">
  <a href="https://getclair.com">
    <img src="https://img.shields.io/badge/Powered%20by-Clair-blue?style=plastic&logo=star&logoColor=white" alt="Powered by Clair">
  </a>
</div>

## ✨ Features

### Core Features

- **Slack Integration** - Connect to your workspace and monitor support channels
- **AI Response Generation** - Support for OpenAI, Anthropic, Google Gemini, and local to come
- **Request Management** - Queue, categorize, and track support requests
- **Documentation Integration** - Upload PDFs and notes for AI context
- **Image Analysis** - Have the AI review screenshots from users or whatever image you provide
- **Device Information** - Integration with Rippling for user/device context
- **Customizable Prompts** - Create and manage AI system prompts
- **Cross-platform** - Available for Windows, macOS, and Linux

### Security & Privacy

- **Local data storage** - All data stored locally
- **No telemetry** - No data collection or tracking
- **Open source** - Full transparency with MIT license

## 🚀 Quick Start

### Download Pre-built Releases (Recommended)

The easiest way to get started is to download a pre-built release:

1. **Visit the releases page**: [GitHub Releases](https://github.com/bagelhole/ai-helpdesk/releases)
2. **Download the latest release** for your operating system:
   - **Windows**: `AI-Helpdesk-Setup-x.x.x.exe`
   - **macOS**: `AI-Helpdesk-x.x.x.dmg` or `AI-Helpdesk-x.x.x-arm64.dmg` (for Apple Silicon)
   - **Linux**: `AI-Helpdesk-x.x.x.AppImage` or `.deb`/`.rpm` packages
3. **Install and run** the application
4. **Continue to Configuration** section below for setup instructions

### Build from Source

If you prefer to build from source or contribute to development:

### Prerequisites

- **Node.js**
- **npm** or **yarn**
- **Slack workspace** with admin permissions
- **API keys** for your chosen services:
  - Slack Bot Token (required)
  - Rippling API Key (optional - hard to get)
  - AI Provider API Key (OpenAI, Anthropic, Google, etc.)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/bagelhole/ai-helpdesk.git
   cd ai-helpdesk
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run build
   npm start
   ```

4. **Build for production**

   ```bash
   npm run build
   npm run dist
   ```

## 🔧 Configuration

### Slack Setup

1. **Create a Slack app** at [api.slack.com](https://api.slack.com/apps)
2. **Add Bot Token Scopes**:
   - `channels:read` - Read channel information
   - `chat:write` - Send messages
   - `im:read` - Access direct messages
   - `users:read` - Read user information
   - `groups:read` - Access private channels
3. **Install the app** to your workspace
4. **Copy the Bot Token** and add it to AI Helpdesk settings

### AI Provider Setup

Choose one or more AI providers:

#### OpenAI

- Get API key from [platform.openai.com](https://platform.openai.com)

- [ ] Tested

#### Anthropic

- Get API key from [console.anthropic.com](https://console.anthropic.com)

- [ ] Tested

#### Google Gemini

- Get API key from [aistudio.google.com](https://aistudio.google.com/)

- [x] Tested

## 📖 Usage Guide

### Initial Setup

1. **Launch AI Helpdesk** from your applications
2. **Navigate to Settings** and configure:
   - Slack bot token
   - AI provider credentials
3. **Test connections** using the connection status indicators
4. **Configure system prompts** for your organization's needs

## 🏗️ Development

### Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

## 📋 Roadmap

### Phase 1: Core Features ✅

- [x] Slack integration
- [x] AI response generation
- [x] Settings management
- [x] Secure credential storage
- [x] Document store and AI usage
- [x] AI Image Analysis

### Phase 2: Enhanced Integration 🚧

- [ ] Google Admin Integration
- [ ] Sentry Integration
- [ ] Microsoft Teams support
- [ ] Some way to monitor your DMs - not possible with Slack API

## Support

### Getting Help

- **Issues**: Report bugs on [GitHub Issues](https://github.com/bagelhole/ai-helpdesk/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/bagelhole/ai-helpdesk/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<br><br>

<div align="center">
  <strong>Built with ❤️</strong>
  <br><br>
  <a href="https://github.com/bagelhole/ai-helpdesk/stargazers">⭐ Star this repo</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/fork">🍴 Fork it</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/issues">🐛 Report a bug</a>
</div>
