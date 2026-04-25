FROM python:3.12-slim

# Allow statements and log messages to immediately appear in the Cloud Run logs
ENV PYTHONUNBUFFERED=True

# Set up the working directory
WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the modern application source code
COPY . ./

# Expose port (Cloud Run sets PORT asynchronously but 8080 is standard)
EXPOSE 8080

# Use Gunicorn as the application server
# - workers: 1 (Cloud Run can scale horizontally)
# - threads: 8 (handle concurrent requests in the same container)
ENTRYPOINT ["gunicorn", "--bind", ":8080", "--workers", "1", "--threads", "8", "main:app"]
