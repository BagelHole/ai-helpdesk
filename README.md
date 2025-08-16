# 🤖 AI Helpdesk

<div align="center">
  <a href="https://getclair.com">
    <img src="https://img.shields.io/badge/Sponsored%20by-Clair-blue?style=for-the-badge&logo=star&logoColor=white" alt="Sponsored by Clair">
  </a>
</div>

<br>

An open-source Electron desktop application that monitors your Slack communications and provides AI-assisted responses to IT requests, enhanced with user context from your documentation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## ✨ Features

### Core Functionality

- **Real-time Slack monitoring** - Monitor tech support channels
- **AI-powered responses** - Generate intelligent responses with multiple AI providers
- **Message queue management** - Organize and prioritize incoming requests
- **Response control** - Review and edit AI responses before sending

### AI Integration

- **Multiple AI providers** - OpenAI, Anthropic, Google Gemini, and Ollama support
- **Custom system prompts** - Fully customizable prompts with visual editor
- **Local AI option** - Use Ollama for privacy-focused deployments
- **Context-aware responses** - Leverage user and device data for better responses

### Customization & Configuration

- **Easy API key management** - Secure, encrypted storage of credentials
- **High configurability** - Extensive settings for all aspects of the application
- **Open source** - Fully transparent and extensible codebase
- **Cross-platform** - Windows, macOS, and Linux support

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
  - Rippling API Key (optional and hard to get)
  - AI Provider API Key (OpenAI, Anthropic, etc.)

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

3. **Set up environment variables** (optional)

   ```bash
   cp .env.example .env
   # Edit .env with your API keys (or configure them in the app)
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Build for production**

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

#### Anthropic

- Get API key from [console.anthropic.com](https://console.anthropic.com)

#### Google Gemini

- Get API key from [makersuite.google.com](https://aistudio.google.com/)

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
3. **Make your changes** with proper TypeScript types
4. **Add tests** for new functionality
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## 📋 Roadmap

### Phase 1: Core Features ✅

- [x] Slack integration
- [x] AI response generation
- [x] Settings management
- [x] Secure credential storage
- [x] Document store and AI usage

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

<div align="center">
  <strong>Built with ❤️</strong>
  <br><br>
  <a href="https://github.com/bagelhole/ai-helpdesk/stargazers">⭐ Star this repo</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/fork">🍴 Fork it</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/issues">🐛 Report a bug</a>
</div>
