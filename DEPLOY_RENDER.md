# 🚀 Deploying to Render (Better Performance)

Deploying to Render keeps your server alive, which means your **Result Cache** works (scanned products load instantly the second time).

## Prerequisite: GitHub
You MUST have this code in a GitHub repository.

1.  **Create a Repo**: Go to [github.com/new](https://github.com/new) and create a repository named `healthyscan-ai`.
2.  **Push Code**:
    ```powershell
    git remote remove origin
    git remote add origin https://github.com/YOUR_USERNAME/healthyscan-ai.git
    git add .
    git commit -m "Ready for deployment"
    git push -u origin main
    ```

## Step 1: Create Web Service
1.  Go to [dashboard.render.com](https://dashboard.render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.

## Step 2: Settings (Important)
Use these EXACT settings:
*   **Name**: `healthyscan-ai`
*   **Runtime**: `Node`
*   **Build Command**: `npm install`
*   **Start Command**: `node server.js`
*   **Instance Type**: `Free`

## Step 3: Environment Variables
You MUST add your API Key here.
1.  Scroll down to **Environment Variables**.
2.  Click **Add Environment Variable**.
3.  **Key**: `GEMINI_API_KEY`
4.  **Value**: `(Paste your API Key here)`
5.  Click **Create Web Service**.

## Done!
Render will take ~3 minutes to build. Your URL will be something like `https://healthyscan-ai.onrender.com`.
