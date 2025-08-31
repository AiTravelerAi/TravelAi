# ML Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY services/ml/requirements.txt ./
RUN pip install -r requirements.txt
COPY services/ml/ ./
CMD ["python", "src/main.py"]
