# 🌍 Deploying to Netlify

Your project is configured for **Netlify Functions**. Follow these steps to put it online.

## Step 1: Login & Deploy
Open your terminal (PowerShell or CMD) and run:

1.  **Login to Netlify**:
    ```powershell
    npx netlify login
    ```
    *(This will open your browser to authorize)*

2.  **Deploy**:
    ```powershell
    npx netlify deploy --prod
    ```
3.  **Follow the Prompts**:
    *   "What would you like to do?": Select **Create & configure a new site**.
    *   "Team": Select your team.
    *   "Site name": Leave blank (random) or type a name like `healthyscan-yourname`.
    *   "Publish directory": Press Enter (accept default `.`).

## Step 2: Add API Key (CRITICAL)
Your `.env` file is hidden for security, so you must tell Netlify your API Key manually.

1.  Go to [app.netlify.com](https://app.netlify.com).
2.  Click on your new site.
3.  Go to **Site configuration** > **Environment variables**.
4.  Add a new variable:
    *   **Key**: `GEMINI_API_KEY`
    *   **Value**: `(Paste your API Key here)`
5.  **Redeploy** (Go to Deploys tab -> Trigger deploy) if needed, usually instant.

## Step 3: Test
Visit your new URL (e.g., `https://healthyscan-xyz.netlify.app`). Everything should work!
