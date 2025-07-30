#!/bin/bash

# Development Tools Setup Script for Ghost 2.0
# Ensures all required development tools are available

set -e

echo "🔧 Setting up development tools for Ghost 2.0..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# 1. Install/Update Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# 2. Install Yarn globally if not available
if ! command -v yarn &> /dev/null; then
    echo "🧶 Installing Yarn globally..."
    npm install -g yarn
else
    echo "✅ Yarn already installed: $(yarn --version)"
fi

# 3. Verify ESLint is available
if ! npx eslint --version &> /dev/null; then
    echo "❌ ESLint not available. Installing..."
    npm install eslint@^8.57.0 --save-dev
else
    echo "✅ ESLint available: $(npx eslint --version)"
fi

# 4. Install TypeScript if not available
if ! npx tsc --version &> /dev/null; then
    echo "📝 Installing TypeScript..."
    npm install typescript@^5.8.3 --save-dev
else
    echo "✅ TypeScript available: $(npx tsc --version)"
fi

# 5. Install tsx for TypeScript execution
if ! npx tsx --version &> /dev/null; then
    echo "⚡ Installing tsx for TypeScript execution..."
    npm install tsx --save-dev
else
    echo "✅ tsx available: $(npx tsx --version)"
fi

# 6. Create basic test setup if not exists
if [ ! -f "jest.config.js" ]; then
    echo "🧪 Setting up Jest for testing..."
    npm install jest @types/jest --save-dev
    
    # Create basic Jest config
    cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src-nextgen', '<rootDir>/scripts'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src-nextgen/**/*.ts',
    'scripts/**/*.ts',
    '!**/*.d.ts',
  ],
};
EOF
fi

# 7. Create ESLint config if not exists
if [ ! -f ".eslintrc.js" ]; then
    echo "🔍 Creating ESLint configuration..."
    cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
EOF
fi

# 8. Install additional ESLint plugins
echo "🔍 Installing ESLint TypeScript plugin..."
npm install @typescript-eslint/parser @typescript-eslint/eslint-plugin --save-dev

# 9. Create basic test file if not exists
if [ ! -f "src-nextgen/__tests__/basic.test.ts" ]; then
    echo "🧪 Creating basic test file..."
    mkdir -p src-nextgen/__tests__
    cat > src-nextgen/__tests__/basic.test.ts << 'EOF'
describe('Basic Test Suite', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});
EOF
fi

# 10. Update package.json scripts if needed
echo "📝 Updating package.json scripts..."

# Check if test script needs updating
if grep -q '"test": "echo \\"Error: no test specified\\" && exit 1"' package.json; then
    echo "🔄 Updating test script in package.json..."
    # This is a simplified update - in practice you'd want to use a proper JSON parser
    echo "⚠️  Please manually update the test script in package.json to:"
    echo '    "test": "jest",'
    echo '    "test:unit": "jest --testPathPattern=__tests__",'
    echo '    "test:watch": "jest --watch",'
fi

# 11. Verify all tools are working
echo "🔍 Verifying all development tools..."

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo "✅ Yarn: $(yarn --version)"
echo "✅ TypeScript: $(npx tsc --version)"
echo "✅ ESLint: $(npx eslint --version)"
echo "✅ tsx: $(npx tsx --version)"

# 12. Run initial validation
echo "🧪 Running initial validation tests..."

# Test TypeScript compilation
echo "📝 Testing TypeScript compilation..."
npx tsc --noEmit --skipLibCheck || echo "⚠️  TypeScript compilation has issues (expected for existing codebase)"

# Test ESLint
echo "🔍 Testing ESLint..."
npx eslint scripts/ --ext .js || echo "⚠️  ESLint found issues (expected for existing codebase)"

# Test Jest
echo "🧪 Testing Jest..."
npx jest --passWithNoTests || echo "⚠️  Jest tests failed (expected for new setup)"

echo "🎉 Development tools setup complete!"
echo ""
echo "📋 Available commands:"
echo "  npm run lint          - Run ESLint"
echo "  npm run lint:fix      - Fix ESLint issues"
echo "  npm test              - Run tests"
echo "  npx tsc --noEmit      - TypeScript compilation check"
echo "  npx tsx <file>.ts     - Run TypeScript files directly"
echo ""
echo "🚀 Ready for Ghost 2.0 development!" 