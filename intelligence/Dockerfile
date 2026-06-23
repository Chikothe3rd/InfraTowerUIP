FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (like build-essential, libpq-dev if building psycopg2 from source, but we use binary)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

CMD ["python", "main.py"]
