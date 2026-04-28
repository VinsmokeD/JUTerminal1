# Deployment Guide

## Pre-Deployment Checklist

See [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for full requirements.

```bash
[ ] Environment variables configured
[ ] JWT_SECRET is 64-char hex (openssl rand -hex 32)
[ ] GEMINI_API_KEY set and quota available
[ ] Database password changed from default
[ ] TLS certificates obtained (Let's Encrypt)
[ ] Nginx config reviewed
[ ] Docker image versions pinned
[ ] Backup strategy in place
[ ] Monitoring/alerting configured
[ ] Load testing completed
[ ] Security audit performed
```

## Production Deployment

### 1. Infrastructure Setup

#### Server Requirements
- Ubuntu 22.04 LTS or similar
- Minimum: 4 CPU cores, 8GB RAM, 100GB SSD
- Recommended: 8 CPU cores, 16GB RAM, 200GB SSD
- Docker 24+, Docker Compose 2.20+

#### SSL/TLS Certificates
```bash
# Using Let's Encrypt (certbot)
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d cybersim.example.com
# Certificates stored in /etc/letsencrypt/live/cybersim.example.com/
```

### 2. Environment Configuration

#### Production .env
```bash
# Copy from .env.example
cp .env.example .env.production

# Edit with production values:
ENVIRONMENT=production
CORS_ORIGINS=https://cybersim.example.com
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
GEMINI_API_KEY=your_production_key  # From Google AI Studio
JWT_EXPIRY_HOURS=8
MAX_CONCURRENT_SESSIONS=50

# Database
POSTGRES_USER=cybersim_prod
POSTGRES_DB=cybersim_prod
POSTGRES_URL=postgresql://cybersim_prod:${POSTGRES_PASSWORD}@postgres:5432/cybersim_prod

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=$(openssl rand -hex 16)  # Add password for prod

# Docker
ENVIRONMENT=production
LOG_LEVEL=WARNING
```

### 3. Docker Image Build & Registry

#### Build Production Images
```bash
# Build backend
docker build -f backend/Dockerfile -t cybersim-backend:1.0.0 ./backend
docker build -f backend/Dockerfile -t cybersim-backend:latest ./backend

# Build frontend
docker build -f frontend/Dockerfile -t cybersim-frontend:1.0.0 ./frontend
docker build -f frontend/Dockerfile -t cybersim-frontend:latest ./frontend

# Build Kali
docker build -f infrastructure/docker/kali/Dockerfile \
  -t cybersim-kali:1.0.0 \
  infrastructure/docker/kali/
```

#### Push to Registry
```bash
# Docker Hub example
docker tag cybersim-backend:1.0.0 yourusername/cybersim-backend:1.0.0
docker push yourusername/cybersim-backend:1.0.0

# Or use private registry (AWS ECR, GCP, etc.)
aws ecr get-login-password | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag cybersim-backend:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/cybersim-backend:1.0.0
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/cybersim-backend:1.0.0
```

### 4. Docker Compose for Production

#### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./infrastructure/postgres/backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal
    # Only available to backend
    expose:
      - "5432"

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb
    volumes:
      - redis_prod_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal
    expose:
      - "6379"

  backend:
    image: cybersim-backend:1.0.0
    restart: always
    environment:
      - ENVIRONMENT=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - POSTGRES_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=WARNING
      - WORKERS=4  # Increase for production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - internal
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: cybersim-frontend:1.0.0
    restart: always
    networks:
      - internal
    expose:
      - "80"

  nginx:
    image: nginx:latest
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./infrastructure/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/cybersim.example.com:/etc/nginx/certs:ro
      - ./infrastructure/nginx/dhparam.pem:/etc/nginx/dhparam.pem:ro
    depends_on:
      - backend
      - frontend
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_prod_data:
    driver: local
  redis_prod_data:
    driver: local

networks:
  internal:
    driver: bridge
```

#### Start Production Environment
```bash
# Load production environment
export $(cat .env.production | xargs)

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Watch startup
docker-compose logs -f

# Verify health
docker-compose ps
```

### 5. Database Initialization

```bash
# Create database and schema
docker-compose exec postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} \
  -f /docker-entrypoint-initdb.d/init.sql

# Run migrations (if using Alembic)
docker-compose exec backend alembic upgrade head

# Load initial scenario data
docker-compose exec backend python -m backend.src.scenarios.loader
```

### 6. Nginx Configuration (Production)

#### nginx.prod.conf
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ws_limit:10m rate=100r/s;

    # Upstream backend
    upstream backend {
        least_conn;
        server backend:8000 max_fails=3 fail_timeout=30s;
    }

    upstream frontend {
        server frontend:3000;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name cybersim.example.com www.cybersim.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name cybersim.example.com www.cybersim.example.com;

        # SSL
        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API (rate limited)
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket (higher rate limit)
        location /ws {
            limit_req zone=ws_limit burst=100 nodelay;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }

        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://backend;
            proxy_http_version 1.1;
        }
    }
}
```

### 7. Monitoring & Alerting

#### Prometheus Metrics (Future)
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'cybersim-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

#### ELK Stack Setup (Future)
```bash
# Elasticsearch, Logstash, Kibana for centralized logging
docker-compose -f docker-compose.elk.yml up -d
```

### 8. Backup Strategy

#### Database Backup
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backup/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec postgres pg_dump -U cybersim_prod cybersim_prod | \
  gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.sql.gz s3://backups/cybersim/
```

```bash
# Schedule with cron (every night at 2 AM)
0 2 * * * /path/to/backup.sh
```

### 9. Scaling Considerations

#### Horizontal Scaling
```bash
# Use Docker Swarm or Kubernetes for multiple backend instances
docker stack deploy -c docker-compose.yml cybersim

# Load balance with Nginx upstream
upstream backend {
    least_conn;
    server backend-1:8000;
    server backend-2:8000;
    server backend-3:8000;
}
```

#### Database Scaling
```bash
# Read replicas for PostgreSQL
Primary → Replica 1, Replica 2
# Use pgBouncerfor connection pooling

# Redis Cluster for horizontal scaling
redis-cluster-1:6379
redis-cluster-2:6379
redis-cluster-3:6379
```

### 10. Performance Tuning

#### PostgreSQL
```sql
-- postgresql.conf
shared_buffers = '256MB'
effective_cache_size = '1GB'
maintenance_work_mem = '64MB'
checkpoint_completion_target = 0.9
wal_buffers = '16MB'
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### Redis
```bash
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

#### Uvicorn (Backend)
```bash
# Production startup
uvicorn src.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --access-log \
  --log-level warning
```

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Verify networks
docker network ls

# Restart all
docker-compose restart
```

### High Memory Usage
```bash
# Check container stats
docker stats

# Increase limits in docker-compose.yml
# or reduce Redis maxmemory policy
```

### Database Connection Issues
```bash
# Test connection
docker-compose exec backend python -c \
  "from backend.src.db.database import engine; print(engine)"

# Check credentials
echo $POSTGRES_PASSWORD
```

### WebSocket Timeouts
```bash
# Increase Nginx timeouts in nginx.prod.conf
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

## Rollback Procedure

```bash
# If deploying a bad version:
docker-compose stop backend frontend
docker-compose rm backend frontend
# Edit docker-compose.yml to previous image version
docker-compose up -d backend frontend
docker-compose logs -f
```

## Post-Deployment

1. **Verify all services running**
   ```bash
   curl -I https://cybersim.example.com
   curl -I https://cybersim.example.com/api/health
   ```

2. **Load test** (using k6 or Apache Bench)
   ```bash
   ab -n 1000 -c 10 https://cybersim.example.com/
   ```

3. **Security scan** (using OWASP ZAP)
   ```bash
   docker pull owasp/zap2docker-stable
   docker run -t owasp/zap2docker-stable zap-baseline.py -t https://cybersim.example.com
   ```

4. **Monitor error logs** for first 24 hours
5. **Test incident response** (trigger alert, verify notification)

## Support & Issues

- **GitHub Issues**: [Report problems](https://github.com/VinsmokeD/JUTerminal1/issues)
- **Documentation**: [Full docs](INDEX.md)
- **Architecture**: [System design](ARCHITECTURE.md)

