# 🚀 Deployment Guide (Render.com)

Since we upgraded your app with **In-Memory Caching** (making repeat scans instantaneous), we need a host that keeps your server running (Persistent Node.js), rather than a serverless host like Vercel/Netlify that would wipe your cache constantly.

**Render** is the best free option for this.

## Step 1: Push to GitHub
1.  Initialize a repository and push this code to GitHub:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    # Link to your new GitHub Key
    # git remote add origin https://github.com/YOUR_USERNAME/healthyscan-ai.git
    # git push -u origin main
    ```

## Step 2: Deploy on Render
1.  Go to [dashboard.render.com](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  Use these settings:
    *   **Name:** `healthyscan-ai`
    *   **Runtime:** `Node`
    *   **Build Command:** `npm install`
    *   **Start Command:** `node server.js`
    *   **Plan:** `Free`

## Step 3: Add Environment Variables
Render needs your Gemini API Key to work.
1.  In the Render Dashboard, go to the **Environment** tab.
2.  Add a new variable:
    *   **Key:** `GEMINI_API_KEY`
    *   **Value:** `(Copy your key from .env)`

## Step 4: Done!
Render will deploy your app. You will get a URL like `https://healthyscan-ai.onrender.com`.
*   **Cache Check:** The first time your app runs, scan a product. Then scan it again. The second time should be instant!

---
**Why not Netlify/Vercel?**
Netlify and Vercel are "Serverless". They shut down your server after every request. This means your **Backend Cache** would be deleted every few seconds, making your "Senior Upgrade" useless. Render keeps it alive.
