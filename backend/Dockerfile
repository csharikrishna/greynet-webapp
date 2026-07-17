FROM python:3.11-slim

WORKDIR /app

# Torch CPU wheels only — no CUDA needed, these models run in single-digit
# to low-double-digit milliseconds on CPU per the project's own benchmarks.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.4.1+cpu torchvision==0.19.1+cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY checkpoints ./checkpoints

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
