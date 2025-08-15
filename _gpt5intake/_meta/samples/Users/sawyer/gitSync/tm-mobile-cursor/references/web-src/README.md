# Thoughtmarks Web Application

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Start development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── lib/            # Utility libraries
├── styles/         # CSS and styling
└── types/          # TypeScript definitions
```

## Deployment

The built application is optimized for static hosting on:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

Build output is generated in the `../web-build` directory.
