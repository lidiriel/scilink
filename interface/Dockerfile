FROM python:3.9-slim AS FRONTEND
# working directory inside the container
WORKDIR /app
COPY . /app
RUN pip install --no-cache-dir -r requirements.txt
# Reveal port 5000 to the outside world
EXPOSE 5000
# Launch workflow.py when the container starts
CMD ["python", "workflow_db.py"]



