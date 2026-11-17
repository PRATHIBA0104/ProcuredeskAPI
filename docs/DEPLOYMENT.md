# Deployment guide

The project has two deployable parts plus a database. **Vercel hosts only the frontend.** The Express API needs a Node host (Render is used below) and the database needs MongoDB Atlas.

| Part | Where | Cost |
|---|---|---|
| Database | MongoDB Atlas (M0 free cluster) | free |
| Backend API | Render (Web Service) | free tier (sleeps after inactivity; first request is slow) |
| Frontend | Vercel | free |

Deploy in this order: database, backend, frontend, then connect the two.

## 1. Database (MongoDB Atlas)

1. Create an account at https://www.mongodb.com/cloud/atlas/register and create a free **M0** cluster.
2. **Database Access** -> add a database user with a password (save it).
3. **Network Access** -> add IP address `0.0.0.0/0` (needed because Render's IP changes; the database user password protects it).
4. **Connect -> Drivers** -> copy the connection string. Replace `<password>` and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/b2b_procurement?retryWrites=true&w=majority`

## 2. Backend (Render)

1. Push the project to GitHub (done: the repository).
2. https://render.com -> **New -> Web Service** -> connect the repository.
3. Settings:
   * **Root Directory:** `backend`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
4. **Environment variables:**

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | the Atlas string from step 1 |
| `JWT_SECRET` | 48+ random characters (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `TRUST_PROXY` | `1` |
| `CORS_ORIGIN` | your Vercel URL (set after step 3; for now `http://localhost:3000`) |

5. Deploy. When it is live, open `https://<your-service>.onrender.com/api/v1/health`. You should see `{"success":true,"status":"ok"}`.

Optional demo data: Render **Shell** tab -> `npm run seed` (it refuses to run when `NODE_ENV=production`, so for a demo either set `NODE_ENV=development` temporarily, or run the seed on your own computer with `MONGODB_URI` pointing at Atlas).

## 3. Frontend (Vercel)

1. https://vercel.com -> **Add New -> Project** -> import the same GitHub repository.
2. **Root Directory:** `frontend` (click Edit and choose the folder). Framework: Next.js (detected).
3. **Environment Variables:** `NEXT_PUBLIC_API_URL` = `https://<your-service>.onrender.com/api/v1`
4. **Deploy.** Vercel gives you a URL such as `https://procuredesk-xxxx.vercel.app`.

## 4. Connect them

Go back to Render -> **Environment** -> set `CORS_ORIGIN` to the exact Vercel URL (no trailing slash; several origins can be comma-separated). Save; Render redeploys. Then open the Vercel URL and register or sign in.

## Known limits of this deployment

* **Uploaded documents are stored on the server's disk.** Render's free web service has an ephemeral disk: files disappear on redeploy or restart. For real use, add a persistent disk (paid) or move storage to object storage (S3 or similar).
* The free Render service sleeps when idle; the first request after a pause can take about a minute.
* Atlas `0.0.0.0/0` access is acceptable for a demo; restrict it for production.
