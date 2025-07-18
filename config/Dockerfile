FROM node:18

# Install Python, pip, and system tools for process detection
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-flask \
    python3-dotenv \
    curl \
    lsof \
    net-tools \
    iproute2 \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install Python dependencies
RUN pip3 install --break-system-packages -r requirements.txt

# Install Node.js dependencies
RUN npm install

# Make the combined script executable
RUN chmod +x run-combined.sh

# Use bash to run the combined script
CMD ["bash", "./run-combined.sh"]
# Injects dynamic tunnel detection into Docker
ENV PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5051/health || exit 1
