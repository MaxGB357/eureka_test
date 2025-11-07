# Eureka Voice Agent - Vercel Deployment Guide

This guide will help you deploy the Eureka Voice Agent to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional but recommended): Install with `npm install -g vercel`
3. **OpenAI API Key**: Your API key starting with `sk-proj-...`

---

## Deployment Methods

### Method 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Navigate to project directory**:
   ```bash
   cd "C:\Users\mgarc\OneDrive\Documentos\AAA Code\eureka_claude_web\eureka_test"
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel
   ```

   - Follow the prompts:
     - **Set up and deploy?** → Yes
     - **Which scope?** → Select your account
     - **Link to existing project?** → No
     - **Project name?** → eureka-voice-agent (or your choice)
     - **Directory?** → ./ (current directory)
     - **Override settings?** → No

5. **Set Environment Variables**:
   ```bash
   vercel env add OPENAI_API_KEY
   ```
   - When prompted, paste your OpenAI API key
   - Select **Production**, **Preview**, and **Development** environments

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

7. **Your app is now live!** Vercel will provide a URL like: `https://eureka-voice-agent.vercel.app`

---

### Method 2: Deploy via GitHub + Vercel Dashboard

1. **Push code to GitHub**:
   ```bash
   cd "C:\Users\mgarc\OneDrive\Documentos\AAA Code\eureka_claude_web\eureka_test"
   git init
   git add .
   git commit -m "Initial commit - Eureka Voice Agent"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/eureka-voice-agent.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **Add New** → **Project**
   - Import your GitHub repository
   - Vercel will auto-detect the configuration from `vercel.json`

3. **Configure Environment Variables**:
   - In the Vercel project settings, go to **Settings** → **Environment Variables**
   - Add:
     - **Name**: `OPENAI_API_KEY`
     - **Value**: Your OpenAI API key (e.g., `sk-proj-...`)
     - **Environments**: Select Production, Preview, Development

4. **Deploy**:
   - Click **Deploy**
   - Wait for deployment to complete
   - Your app will be live at the provided URL

---

### Method 3: Deploy via Vercel Dashboard (Direct Upload)

1. **Create a ZIP file** of the project:
   - Include: `public/`, `api/`, `vercel.json`, `package.json`, `.vercelignore`
   - Exclude: `node_modules/`, `.env`, `src/`, `dist/`

2. **Upload to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click **Add New** → **Project**
   - Select **Upload** tab
   - Drag and drop your ZIP file

3. **Configure Environment Variables** (same as Method 2, step 3)

4. **Deploy** (same as Method 2, step 4)

---

## Post-Deployment Configuration

### 1. Verify Environment Variables

In your Vercel project dashboard:
- Go to **Settings** → **Environment Variables**
- Ensure `OPENAI_API_KEY` is set for all environments
- Value should start with `sk-proj-`

### 2. Test the Deployment

1. Visit your deployed URL (e.g., `https://eureka-voice-agent.vercel.app`)
2. Click **"Conectar & Empezar a Charlar"**
3. Grant microphone permissions when prompted
4. Test voice interaction with Eureka
5. Test text input functionality

### 3. Check Logs

If there are issues:
- Go to your project in Vercel Dashboard
- Click on **Deployments** → Select latest deployment
- View **Function Logs** to see backend errors
- Check browser console for frontend errors

---

## Project Structure for Vercel

```
eureka_test/
├── api/                    # Serverless functions
│   ├── session.ts         # POST /api/session - Get ephemeral key
│   └── health.ts          # GET /api/health - Health check
├── public/                # Static frontend files
│   ├── index.html        # Main HTML
│   ├── agent.js          # Frontend logic
│   ├── eureka-avatar.png # Eureka image
│   └── agrosuper-logo.png # Agrosuper logo
├── vercel.json           # Vercel configuration
├── .vercelignore        # Files to exclude from deployment
└── package.json         # Dependencies and scripts
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key with Realtime API access | `sk-proj-...` |

### How to Add in Vercel Dashboard

1. Project Settings → Environment Variables
2. Click **Add New**
3. Enter variable name and value
4. Select environments (Production, Preview, Development)
5. Click **Save**

---

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your custom domain (e.g., `eureka.agrosuper.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (can take up to 48 hours)

---

## Troubleshooting

### Issue: "OpenAI API key not configured"

**Solution**:
- Verify `OPENAI_API_KEY` is set in Vercel environment variables
- Redeploy after adding the variable: `vercel --prod`

### Issue: API endpoints return 404

**Solution**:
- Check `vercel.json` configuration is correct
- Ensure `api/` folder contains `session.ts` and `health.ts`
- Verify files have `.ts` extension
- Redeploy

### Issue: Images not loading

**Solution**:
- Ensure `eureka-avatar.png` and `agrosuper-logo.png` are in `public/` folder
- Check file names match exactly (case-sensitive)
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### Issue: "Connection timeout"

**Solution**:
- Check browser console for errors
- Verify OpenAI API key has Realtime API access
- Test health endpoint: `https://your-url.vercel.app/api/health`

### Issue: Microphone not working

**Solution**:
- HTTPS is required for microphone access (Vercel provides this automatically)
- Grant microphone permissions when browser prompts
- Check browser console for permission errors

---

## Monitoring and Analytics

### Function Logs

View real-time logs:
```bash
vercel logs --follow
```

Or in Vercel Dashboard:
- **Deployments** → Select deployment → **Function Logs**

### Usage Monitoring

- Go to **Analytics** tab in Vercel Dashboard
- Monitor API calls, response times, and errors
- Track OpenAI API usage in [OpenAI Dashboard](https://platform.openai.com/usage)

---

## Updating the Deployment

After making code changes:

**Via CLI**:
```bash
vercel --prod
```

**Via GitHub**:
- Push changes to main branch
- Vercel auto-deploys

**Manual**:
- Upload new ZIP file to Vercel Dashboard

---

## Rollback

If a deployment has issues:

1. Go to **Deployments** in Vercel Dashboard
2. Find a previous working deployment
3. Click **⋯** (three dots) → **Promote to Production**

---

## Cost Estimation

### Vercel Costs (Free Tier Generous)
- **Hobby Plan**: Free
  - 100GB bandwidth/month
  - 100 serverless function executions/day
  - Unlimited static file requests

### OpenAI Costs (Realtime API)
- **Audio Input**: $0.06 per minute
- **Audio Output**: $0.24 per minute
- **Text Input**: $5.00 per 1M tokens
- **Text Output**: $20.00 per 1M tokens
- **Transcription (Whisper)**: Included

**Example**: 1 hour of conversation ≈ $18 USD

Monitor usage: [OpenAI Usage Dashboard](https://platform.openai.com/usage)

---

## Security Best Practices

1. ✅ **Never commit `.env` file** - Already excluded in `.vercelignore`
2. ✅ **Use environment variables** - API key stored securely in Vercel
3. ✅ **HTTPS only** - Vercel provides automatic SSL
4. ✅ **Ephemeral keys** - Frontend uses temporary keys, not main API key
5. ✅ **CORS configured** - API functions have CORS headers

---

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **OpenAI Realtime API**: [platform.openai.com/docs/guides/realtime](https://platform.openai.com/docs/guides/realtime)
- **Project Issues**: Check browser console and Vercel function logs

---

## Quick Command Reference

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (preview)
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add OPENAI_API_KEY

# View logs
vercel logs --follow

# List deployments
vercel ls

# Remove project
vercel rm eureka-voice-agent
```

---

## Success Checklist

- [ ] Vercel account created
- [ ] Project deployed to Vercel
- [ ] `OPENAI_API_KEY` environment variable configured
- [ ] Images (`eureka-avatar.png`, `agrosuper-logo.png`) in `public/` folder
- [ ] Deployment URL accessible
- [ ] "Conectar" button works
- [ ] Microphone permissions granted
- [ ] Voice interaction functional
- [ ] Text input working
- [ ] Agent responds in Spanish (Chilean)
- [ ] No console errors

---

**¡Listo!** Your Eureka Voice Agent is now live on Vercel! 🚀
