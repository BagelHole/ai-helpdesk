# AI Model Selection Feature

This document describes the new AI model selection feature that allows users to choose from the latest available models from different AI providers.

## Overview

The AI Helpdesk now supports selecting from the latest models available from:

- **OpenAI**: GPT-5, GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 4 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus
- **Google**: Gemini 2.5 Pro, Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 1.0 Pro
- **Ollama**: Support for locally hosted models (discovered dynamically)

## Features

### 1. Simplified API Configuration

In the Settings → API Configuration tab, users can:

- Configure API keys for different providers
- API keys automatically enable the corresponding AI providers

### 2. Compact Model Selection

When generating AI responses for Slack messages:

- Users can choose which AI provider and model to use from a compact dropdown
- The interface is similar to Cursor's model selector - clean and minimal
- Shows context window information for each model
- Model selection is persistent across sessions (saved to localStorage)
- Only appears in the message view, not in settings

### 3. Dynamic Model Discovery

The system attempts to discover available models from the provider APIs:

- **OpenAI**: Fetches models from `/models` endpoint
- **Google**: Fetches models from `/v1beta/models` endpoint
- **Ollama**: Fetches models from `/api/tags` endpoint
- **Anthropic**: Uses predefined list (no public models endpoint)

If API discovery fails, the system falls back to hardcoded latest model definitions.

## Implementation Details

### Components

- **ModelSelector**: Compact dropdown component for model selection (similar to Cursor's interface)
- **MessageDetail Integration**: Model selector in AI response generation area
- **Persistence**: Uses localStorage to remember user's model preferences

### Data Flow

1. User configures API keys in Settings
2. System builds list of enabled providers
3. For each provider, system attempts to discover available models
4. During message generation, user selects their preferred model
5. Model selection is automatically saved to localStorage for persistence
6. Selected model is passed to AI service for response generation

### Model Definitions

Latest model definitions are maintained in `/src/shared/models/latest-models.ts`:

- Model IDs, names, context windows, token limits
- Default model flags (only one per provider)
- Provider-specific formatting
- No cost information (removed to avoid maintenance overhead)

### API Changes

New IPC endpoints:
- `ai:getAvailableModels(providerId)` - Discover models for a provider

Updated endpoints:
- `ai:generateResponse` now accepts `modelId` parameter

### Settings Schema

Added to `AISettings`:
```typescript
interface AISettings {
  // ... existing fields
  selectedModels?: Record<string, { providerId: string; modelId: string }>;
}
```

## Usage

### Configuring Providers

1. Go to Settings → API Configuration
2. Enter API keys for desired providers
3. Save configuration

### Using Models for Responses

1. Open a Slack message in the MessageDetail view
2. Select desired AI model from dropdown
3. Enter your prompt
4. Generate response using selected model

## Future Enhancements

- **Model Performance Metrics**: Track response quality by model
- **Cost Tracking**: Monitor usage costs per model
- **Model Recommendations**: Suggest best model based on message type
- **Custom Model Configurations**: Allow fine-tuning parameters per model
- **Batch Processing**: Select different models for different types of requests

## Technical Notes

### Error Handling

- Graceful fallback to default models if API discovery fails
- Clear error messages for invalid API keys
- Timeout handling for slow model discovery requests

### Performance

- Model lists are cached to avoid repeated API calls
- Lazy loading of model information
- Efficient dropdown rendering for large model lists

### Security

- API keys are stored securely and not logged
- Model discovery respects rate limits
- Proper validation of model IDs before API calls