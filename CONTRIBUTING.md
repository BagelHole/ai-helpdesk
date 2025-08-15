# Contributing to AI Helpdesk

Thank you for your interest in contributing to AI Helpdesk! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to a Code of Conduct that we expect all contributors to follow. Please read and follow it in all your interactions with the project.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed** and what behavior you expected
- **Include screenshots** if they help explain your problem
- **Include your environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description** of the suggested enhancement
- **Provide specific examples** to demonstrate the enhancement
- **Describe the current behavior** and explain the behavior you expected
- **Explain why this enhancement would be useful**

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ai-helpdesk.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Set up your development environment following the [Setup Guide](docs/SETUP_GUIDE.md)

### Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features or bug fixes
3. **Ensure all tests pass**: `npm test`
4. **Follow the coding style**: `npm run lint`
5. **Update the README.md** with details of changes if applicable
6. **Create a pull request** with a clear description of changes

### Coding Standards

#### TypeScript

- Use TypeScript for all new code
- Provide proper type definitions
- Avoid `any` types when possible
- Use interfaces for object shapes

#### React Components

- Use functional components with hooks
- Follow the established component structure
- Use proper prop typing
- Handle loading and error states

#### Code Style

- Follow the ESLint configuration
- Use meaningful variable and function names
- Write self-documenting code
- Add comments for complex logic

#### Git Commits

- Use clear, descriptive commit messages
- Start with a verb in present tense
- Keep the first line under 50 characters
- Add detailed description if needed

Example:

```
Add Rippling user synchronization

- Implement user data fetching from Rippling API
- Add caching layer for user information
- Include device and application data
- Add error handling and retry logic
```

## Project Structure

```
ai-helpdesk/
├── src/
│   ├── main/              # Electron main process
│   │   ├── services/      # Backend services
│   │   └── main.ts        # App entry point
│   ├── renderer/          # React frontend
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Frontend services
│   │   └── utils/         # Utility functions
│   ├── shared/            # Shared code
│   └── preload/           # Preload scripts
├── docs/                  # Documentation
├── tests/                 # Test files
└── build/                 # Build configuration
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for new functions and components
- Use React Testing Library for component tests
- Mock external dependencies appropriately
- Aim for high test coverage on critical paths

### Test Structure

```typescript
describe("ComponentName", () => {
  it("should render correctly", () => {
    // Test implementation
  });

  it("should handle user interaction", () => {
    // Test implementation
  });
});
```

## Documentation

### API Documentation

- Document all public APIs and interfaces
- Include examples for complex functions
- Update type definitions when changing APIs

### Component Documentation

- Use JSDoc comments for component props
- Document component behavior and use cases
- Include usage examples

### README Updates

- Keep the README current with new features
- Update installation instructions if needed
- Add new configuration options

## Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md with new features and fixes
3. **Testing**: Ensure all tests pass and manual testing is complete
4. **Build**: Create production builds for all platforms
5. **Tag**: Create a git tag for the release
6. **Release**: Create GitHub release with binaries

## Community

### Getting Help

- Check existing issues and documentation first
- Use GitHub Discussions for questions
- Join our community channels

### Helping Others

- Answer questions in issues and discussions
- Review pull requests
- Improve documentation
- Share usage examples

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributor graph

## License

By contributing to AI Helpdesk, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to reach out by:

- Opening an issue
- Starting a discussion
- Contacting the maintainers

Thank you for contributing to AI Helpdesk! 🚀
