FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port 5051 (Python Ghost Runner)
EXPOSE 5051

# Set environment variables
ENV PYTHON_PORT=5051
ENV PORT=5051
ENV NODE_ENV=production

# Run the Flask application
CMD ["python3", "-m", "gpt_cursor_runner.main"]
