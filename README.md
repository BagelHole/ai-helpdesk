# 🤖 AI Helpdesk

> Intelligent Slack assistant for IT support automation with Rippling integration

<div align="center">
  <a href="https://getclair.com">
    <img src="https://img.shields.io/badge/Sponsored%20by-Clair-blue?style=for-the-badge&logo=star&logoColor=white" alt="Sponsored by Clair">
  </a>
</div>

<br>

An open-source Electron desktop application that monitors your Slack communications and provides AI-assisted responses to IT requests, enhanced with user context from Rippling API integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## ✨ Features

### Core Functionality

- **Real-time Slack monitoring** - Monitor DMs and tech support channels
- **AI-powered responses** - Generate intelligent responses with multiple AI providers
- **Rippling integration** - Fetch user and device information for enhanced context
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

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Slack workspace** with admin permissions
- **API keys** for your chosen services:
  - Slack Bot Token (required)
  - Rippling API Key (optional but recommended)
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

### Rippling Integration

1. **Generate API key** in your Rippling admin panel
2. **Configure permissions** for:
   - Employee data access
   - Device information
   - Application listings
3. **Add API key** to AI Helpdesk settings

### AI Provider Setup

Choose one or more AI providers:

#### OpenAI

- Get API key from [platform.openai.com](https://platform.openai.com)
- Supports GPT-4, GPT-3.5-turbo models

#### Anthropic

- Get API key from [console.anthropic.com](https://console.anthropic.com)
- Supports Claude-3 models

#### Google Gemini

- Get API key from [makersuite.google.com](https://makersuite.google.com)
- Supports Gemini Pro models

#### Ollama (Local)

- Install [Ollama](https://ollama.ai/) locally
- Pull models: `ollama pull llama2` or `ollama pull codellama`
- Perfect for privacy-conscious deployments

## 📖 Usage Guide

### Initial Setup

1. **Launch AI Helpdesk** from your applications
2. **Navigate to Settings** and configure:
   - Slack bot token
   - Rippling API key (optional)
   - AI provider credentials
3. **Test connections** using the connection status indicators
4. **Configure system prompts** for your organization's needs

### Daily Workflow

1. **Monitor the message queue** for incoming IT requests
2. **Select messages** to process with AI assistance
3. **Choose response mode**:
   - **Auto-response**: AI sends response directly
   - **Suggestion mode**: Review and edit before sending
4. **Track analytics** to optimize response quality

### Advanced Features

- **Custom response rules** for automatic processing
- **Escalation workflows** for complex issues
- **Batch processing** for high-volume scenarios
- **Analytics dashboard** for performance tracking

## 🏗️ Development

### Project Structure

```
ai-helpdesk/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── services/         # Backend services
│   │   └── main.ts           # Application entry point
│   ├── renderer/             # React frontend
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom hooks
│   │   └── App.tsx           # Main React component
│   ├── shared/               # Shared types and utilities
│   └── preload/              # Electron preload scripts
├── docs/                     # Documentation
└── build/                    # Build configuration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run type-check` - TypeScript type checking

### Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript types
4. **Add tests** for new functionality
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## 📊 Use Cases

### IT Support Scenarios

- **Password resets** - Automated instructions with user-specific details
- **VPN troubleshooting** - Step-by-step guides based on user's OS
- **Software installation** - Custom instructions per user's device
- **Access requests** - Streamlined approval workflows
- **Hardware issues** - Diagnostics based on device specifications

### Beyond IT Support

- **General Slack management** - Handle any type of recurring questions
- **Customer support** - Automate common customer inquiries
- **HR assistance** - Employee onboarding and policy questions
- **Project coordination** - Status updates and meeting scheduling

## 🔒 Security & Privacy

### Data Protection

- **Encrypted API key storage** using Electron's safeStorage
- **Local data encryption** for cached user information
- **No data sent to third parties** (except chosen AI providers)
- **Audit logging** for all AI interactions

### Privacy Options

- **Local AI models** via Ollama integration
- **Data retention controls** with configurable expiry
- **User consent management** for data processing
- **GDPR compliance** features built-in

## 📋 Roadmap

### Phase 1: Core Features ✅

- [x] Basic Slack integration
- [x] AI response generation
- [x] Settings management
- [x] Secure credential storage

### Phase 2: Enhanced Integration 🚧

- [ ] Complete Rippling integration
- [ ] Advanced message filtering
- [ ] Response templates system
- [ ] Analytics dashboard

### Phase 3: Advanced Features 📅

- [ ] Microsoft Teams support
- [ ] Email monitoring
- [ ] Mobile companion app
- [ ] Advanced workflow automation

### Phase 4: Enterprise Features 📅

- [ ] Multi-tenant support
- [ ] Advanced analytics
- [ ] Integration marketplace
- [ ] Enterprise SSO

## 🆘 Support

### Getting Help

- **Documentation**: Check the [Wiki](https://github.com/bagelhole/ai-helpdesk/wiki)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/bagelhole/ai-helpdesk/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/bagelhole/ai-helpdesk/discussions)

### Common Issues

**Q: Can't connect to Slack**

- Verify bot token permissions
- Check network connectivity
- Ensure workspace allows custom apps

**Q: AI responses are not relevant**

- Customize system prompts for your organization
- Ensure user context is being loaded from Rippling
- Try different AI models

**Q: High memory usage**

- Reduce message cache size in settings
- Disable unused integrations
- Consider using local AI models

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Slack API** for excellent developer experience
- **OpenAI, Anthropic, Google** for powerful AI capabilities
- **Electron and React** communities for amazing frameworks
- **All contributors** who help improve this project

---

<div align="center">
  <strong>Built with ❤️ for the IT support community</strong>
  <br><br>
  <a href="https://github.com/bagelhole/ai-helpdesk/stargazers">⭐ Star this repo</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/fork">🍴 Fork it</a> •
  <a href="https://github.com/bagelhole/ai-helpdesk/issues">🐛 Report a bug</a>
</div>
