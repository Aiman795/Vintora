# Vintora Docker Deployment

This setup runs Vintora as one Docker Compose stack:

- `frontend`: React production build served by nginx
- `backend`: Node/Express API and Socket.io
- `python-service`: Visual Search, Smart Closet embeddings, and closet auto-tagging
- `tryon-service`: Virtual Try-On API
- `mongo`: optional local MongoDB for demo/local deployment

## 1. Prepare Environment

Copy the Docker env template:

```bash
cp .env.docker.example .env
```

Edit `.env` and set:

```env
JWT_SECRET=your-long-secret
ADMIN_INVITE_CODE=your-admin-code
EMAIL_USER=your-gmail-address
EMAIL_PASS=your-gmail-app-password
```

For MongoDB Atlas, replace:

```env
MONGODB_URI=mongodb+srv://...
```

For a fully local Docker demo, keep:

```env
MONGODB_URI=mongodb://mongo:27017/vintora
```

## 2. Build And Run

```bash
docker compose up --build
```

Open:

```text
http://localhost
```

If port 80 is busy, set another port in `.env`:

```env
FRONTEND_PORT=8080
CLIENT_URL=http://localhost:8080
```

Then open:

```text
http://localhost:8080
```

## 3. Seed Data

After containers are running:

```bash
docker compose exec backend npm run seed
docker compose exec backend npm run seed:admin
```

## 4. URLs Inside Docker

The browser uses one public site URL. nginx proxies:

- `/api` -> backend
- `/uploads` -> backend uploaded files
- `/socket.io` -> backend Socket.io
- `/ai` -> Python AI service
- `/tryon` -> Try-On service

That means frontend build variables are set to relative paths:

```env
VITE_API_URL=/api
VITE_PYTHON_URL=/ai
VITE_TRYON_URL=/tryon
```

## 5. Notes For Deployment

- The try-on image is large because it includes PyTorch, YOLO, and model weights.
- Free hosting platforms may not have enough RAM/CPU for `tryon-service`.
- If the AI containers are too heavy for your host, you can still run only frontend/backend/Mongo and keep the app fallbacks.
- Uploaded listing images are stored in the `server_uploads` Docker volume.

## 6. Stop The Stack

```bash
docker compose down
```

To delete local database/uploads too:

```bash
docker compose down -v
```
