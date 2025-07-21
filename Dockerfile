FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install Node.js dependencies
RUN npm install

# Create Python virtual environment and install dependencies
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install -r requirements.txt

# Run both Node.js and Python services
CMD ["npm", "run", "dev:both"]

# Injects dynamic tunnel detection into Docker
ENV PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5555/health || exit 1
