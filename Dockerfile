FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "run", "dev"]
# Injects dynamic tunnel detection into Docker
ENV PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5555/health || exit 1
