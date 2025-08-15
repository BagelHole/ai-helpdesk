# 🚀 Setup Guide

This guide will walk you through setting up AI Helpdesk from scratch, including all necessary API integrations and configurations.

## Prerequisites

Before you begin, ensure you have:

- **Node.js v18+** installed
- **Admin access** to your Slack workspace
- **API keys** from your chosen services
- **Rippling account** (optional but recommended)

## Step 1: Project Setup

### 1.1 Clone and Install

```bash
# Clone the repository
git clone https://github.com/bagelhole/ai-helpdesk.git
cd ai-helpdesk

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### 1.2 Initial Configuration

Open the `.env` file and add your API keys as you obtain them throughout this guide.

## Step 2: Slack Integration

### 2.1 Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Name your app (e.g., "AI Helpdesk Bot")
5. Select your workspace

### 2.2 Configure Bot Permissions

In your Slack app configuration:

1. Go to **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add the following scopes:
   - `channels:read` - Read channel information
   - `chat:write` - Send messages as the bot
   - `im:read` - Access direct messages
   - `users:read` - Read user information
   - `groups:read` - Access private channels
   - `app_mentions:read` - Read mentions of your app

### 2.3 Enable Socket Mode (for real-time events)

1. Go to **"Socket Mode"**
2. Enable Socket Mode
3. Create an **App-Level Token** with `connections:write` scope
4. Save the token (starts with `xapp-`)

### 2.4 Subscribe to Events

1. Go to **"Event Subscriptions"**
2. Enable Events
3. Subscribe to these Bot Events:
   - `message.channels` - Messages in channels
   - `message.groups` - Messages in private channels
   - `message.im` - Direct messages
   - `app_mention` - When bot is mentioned

### 2.5 Install the App

1. Go to **"Install App"**
2. Click **"Install to Workspace"**
3. Authorize the permissions
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 2.6 Update Environment Variables

Add to your `.env` file:

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here
```

## Step 3: Rippling Integration

### 3.1 Generate API Key

1. Log into your Rippling admin panel
2. Go to **Settings** → **API Keys**
3. Create a new API key with these permissions:
   - **Employees**: Read access
   - **Devices**: Read access
   - **Applications**: Read access

### 3.2 Configure Permissions

Ensure your API key has access to:

- Employee directory data
- Device inventory
- Software application listings
- User-device mappings

### 3.3 Update Configuration

Add to your `.env` file:

```bash
RIPPLING_API_KEY=your-rippling-api-key-here
RIPPLING_BASE_URL=https://api.rippling.com
```

## Step 4: AI Provider Setup

Choose one or more AI providers based on your needs:

### 4.1 OpenAI (Recommended)

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Go to **API Keys** section
4. Create a new API key
5. Add to `.env`:
   ```bash
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

**Recommended models:**

- `gpt-4` - Best quality, higher cost
- `gpt-3.5-turbo` - Good balance of quality and cost

### 4.2 Anthropic Claude

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account and verify
3. Generate an API key
4. Add to `.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

**Recommended models:**

- `claude-3-opus` - Highest capability
- `claude-3-sonnet` - Good balance
- `claude-3-haiku` - Fastest, most cost-effective

### 4.3 Google Gemini

1. Visit [makersuite.google.com](https://makersuite.google.com)
2. Create a project and enable the API
3. Generate an API key
4. Add to `.env`:
   ```bash
   GOOGLE_API_KEY=your-google-api-key-here
   ```

### 4.4 Ollama (Local AI)

For privacy-focused deployments:

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model:
   ```bash
   ollama pull llama2
   # or
   ollama pull codellama
   ```
3. Ensure Ollama is running:
   ```bash
   ollama serve
   ```
4. Add to `.env`:
   ```bash
   OLLAMA_URL=http://localhost:11434
   ```

## Step 5: Application Configuration

### 5.1 Start the Application

```bash
# Development mode
npm run dev

# Or build and run production
npm run build
npm start
```

### 5.2 Initial Setup Wizard

When you first launch AI Helpdesk:

1. The app will guide you through initial setup
2. Enter your API keys in the Settings panel
3. Test connections to ensure everything works
4. Configure your system prompts

### 5.3 Configure System Prompts

Navigate to **Settings** → **AI Configuration**:

1. **Create a base system prompt** for your organization
2. **Include context variables** like:
   - Company name and policies
   - Common IT procedures
   - Escalation contacts
   - Tone and style guidelines

Example system prompt:

```
You are an AI assistant for [Company Name] IT support. You help employees with technical issues in a friendly, professional manner.

Context:
- Company: [Company Name]
- IT Support Hours: 9 AM - 6 PM EST
- Escalation Contact: it-support@company.com
- Knowledge Base: https://company.wiki.com

Guidelines:
- Be concise but thorough
- Always ask for clarification if needed
- Escalate complex hardware issues
- Provide step-by-step instructions
- Include relevant links when helpful

Available user context:
- User's name, department, and role
- Device information (OS, model, installed software)
- Previous ticket history
```

## Step 6: Testing and Validation

### 6.1 Test Slack Connection

1. Check the connection status in the sidebar
2. Send a test message to the bot in Slack
3. Verify the message appears in AI Helpdesk queue

### 6.2 Test Rippling Integration

1. Look up a user's information
2. Verify device data is populated
3. Check that software lists are accurate

### 6.3 Test AI Responses

1. Select a test message
2. Generate an AI response
3. Review and edit the response
4. Send it back to Slack

### 6.4 Verify End-to-End Flow

1. Have a colleague send an IT question to the bot
2. Process it through AI Helpdesk
3. Confirm they receive a helpful response
4. Check analytics for proper tracking

## Step 7: Advanced Configuration

### 7.1 Auto-Response Rules

Set up rules for automatic responses:

1. Go to **Settings** → **Automation**
2. Create rules based on:
   - Message content keywords
   - User department or role
   - Time of day
   - Message urgency

### 7.2 Escalation Workflows

Configure automatic escalation:

1. Set escalation triggers
2. Define escalation recipients
3. Configure urgency levels
4. Set up notification preferences

### 7.3 Custom Response Templates

Create reusable templates:

1. Common password reset instructions
2. VPN setup guides by OS
3. Software installation procedures
4. Access request forms

## Troubleshooting

### Common Issues

**Slack bot not responding:**

- Check bot token permissions
- Verify Socket Mode is enabled
- Ensure the bot is invited to relevant channels

**Rippling data not loading:**

- Verify API key permissions
- Check network connectivity
- Confirm user email matching between Slack and Rippling

**AI responses failing:**

- Check API key validity and usage limits
- Verify internet connectivity
- Try a different AI provider

**High memory usage:**

- Reduce message cache size in settings
- Clear old message history
- Disable unused integrations

### Getting Help

- Check the [troubleshooting wiki](https://github.com/bagelhole/ai-helpdesk/wiki/Troubleshooting)
- Open an issue on [GitHub](https://github.com/bagelhole/ai-helpdesk/issues)
- Join the community [discussions](https://github.com/bagelhole/ai-helpdesk/discussions)

## Security Checklist

- [ ] API keys are stored securely (never in code)
- [ ] Local data encryption is enabled
- [ ] Audit logging is configured
- [ ] Access controls are properly set
- [ ] Regular backups are scheduled
- [ ] Update notifications are enabled

## Next Steps

After setup is complete:

1. **Train your team** on using the system
2. **Monitor analytics** to optimize performance
3. **Refine system prompts** based on real usage
4. **Set up regular maintenance** schedules
5. **Plan for scaling** as usage grows

---

Congratulations! Your AI Helpdesk is now ready to streamline your IT support operations. 🎉
