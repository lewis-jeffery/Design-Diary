# Contributing to Design Diary

Thank you for your interest in contributing to Design Diary! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- Git
- A code editor (VS Code recommended)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/design-diary.git
   cd design-diary
   ```

2. **Install Dependencies**
   ```bash
   # Frontend dependencies
   npm install
   
   # Backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Start Development Environment**
   ```bash
   ./start-dev.sh
   ```

## 🏗️ Project Structure

```
design-diary/
├── src/                    # React frontend
│   ├── components/         # React components
│   │   ├── Canvas/         # Canvas and page system
│   │   ├── Cell/           # Cell components
│   │   └── Toolbar/        # Toolbar components
│   ├── services/          # API services and utilities
│   ├── store/             # Zustand state management
│   └── types/             # TypeScript type definitions
├── server/                # Python execution server
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🎯 How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Include reproduction steps** and environment details
4. **Add screenshots** if applicable

### Suggesting Features

1. **Check the roadmap** in README.md
2. **Open a feature request** with detailed description
3. **Explain the use case** and expected behavior
4. **Consider implementation complexity**

### Code Contributions

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm test
   cd server && npm test
   ```

4. **Commit with clear messages**
   ```bash
   git commit -m "feat: add multi-column page layout"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### TypeScript/React

- **Use TypeScript** for all new code
- **Follow React hooks patterns** for state management
- **Use styled-components** for styling
- **Prefer functional components** over class components
- **Add proper type annotations** for all functions and interfaces

```typescript
// Good
interface CellProps {
  id: string;
  type: CellType;
  position: Position;
  onUpdate: (id: string, data: CellData) => void;
}

const Cell: React.FC<CellProps> = ({ id, type, position, onUpdate }) => {
  // Component implementation
};
```

### State Management

- **Use Zustand** for global state
- **Keep state minimal** and normalized
- **Use proper TypeScript types** for state interfaces
- **Implement proper actions** for state updates

```typescript
// Good
interface StoreState {
  document: DesignDocument;
  updateCell: (id: string, updates: Partial<Cell>) => void;
  addCell: (type: CellType, position: Position) => void;
}
```

### Styling

- **Use styled-components** for component styling
- **Follow the existing theme** structure
- **Use consistent spacing** and colors
- **Make components responsive** when appropriate

```typescript
// Good
const StyledButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 4px;
  background: ${props => props.$variant === 'primary' ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  cursor: pointer;
  
  &:hover {
    opacity: 0.9;
  }
`;
```

### File Organization

- **Group related components** in folders
- **Use index files** for clean imports
- **Separate concerns** (components, services, types)
- **Follow naming conventions**:
  - Components: `PascalCase.tsx`
  - Hooks: `use*.ts`
  - Services: `*Service.ts`
  - Types: `*.types.ts`

## 🧪 Testing

### Frontend Tests
```bash
npm test
```

### Backend Tests
```bash
cd server && npm test
```

### Test Guidelines
- **Write tests for new features**
- **Test edge cases and error conditions**
- **Use descriptive test names**
- **Mock external dependencies**

## 📚 Documentation

### Code Documentation
- **Add JSDoc comments** for complex functions
- **Document component props** with TypeScript interfaces
- **Explain complex algorithms** with inline comments

### README Updates
- **Update feature lists** when adding new functionality
- **Add usage examples** for new features
- **Update installation instructions** if needed

## 🔄 Pull Request Process

### Before Submitting
- [ ] Code follows the style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Feature works in both development and production builds

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)

## Screenshots
(If applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process
1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** and merge

## 🏷️ Commit Message Guidelines

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```bash
feat(canvas): add multi-column page layout
fix(cells): resolve text cell rendering issue
docs(readme): update installation instructions
refactor(store): simplify state management logic
```

## 🎨 Design Guidelines

### Visual Consistency
- **Follow the existing design system**
- **Use consistent spacing** (8px grid system)
- **Maintain color palette** consistency
- **Ensure accessibility** (contrast, keyboard navigation)

### User Experience
- **Keep interactions intuitive**
- **Provide clear feedback** for user actions
- **Handle loading and error states**
- **Maintain performance** for large documents

## 🐛 Debugging

### Common Issues
- **Port conflicts**: Check if ports 3000 and 3001 are available
- **Python path issues**: Ensure Python is in PATH
- **Module not found**: Run `npm install` in both root and server directories

### Debug Tools
- **React DevTools**: For component debugging
- **Browser DevTools**: For network and console debugging
- **VS Code Debugger**: For server-side debugging

## 📞 Getting Help

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Code Review**: Ask for feedback on complex changes

## 🙏 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

Thank you for contributing to Design Diary! 🎉
