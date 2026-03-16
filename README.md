# AI Resume Analyzer

Full-stack app:

- **Frontend**: Vite + React + TypeScript + shadcn-ui + Tailwind
- **Backend**: Node.js + Express (deployable to Render)
- **Database**: MongoDB (MongoDB Atlas)

## Run locally

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` in the frontend `.env` to point to your backend (default: `http://localhost:8080`).

## Deploy (Render)

- Create a **Web Service** from the `backend/` folder
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Environment**:
    - `MONGODB_URI`
    - `JWT_SECRET`
    - `CORS_ORIGIN` (your frontend domain)
    - `PORT` (Render sets this automatically; keep optional)

