# LMS Platform - Vercel Deployment Guide

## Prerequisites

- GitHub account with your LMS project repository
- Vercel account (free tier available)
- Domain name (optional)

## Step 1: Prepare Frontend for Production

### 1.1 Update Environment Variables

Create a `.env.local` file in the frontend directory with your production backend URL:

```bash
VITE_BACKEND_URL=https://your-windows-server-domain.com
VITE_APP_ENV=production
VITE_APP_NAME=LMS Platform
```

### 1.2 Verify Build Configuration

Check that your `vite.config.js` is properly configured for production:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
  server: {
    port: 5174,
  }
})
```

### 1.3 Test Local Build

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Test production build
npm run build

# Test preview
npm run preview
```

## Step 2: Deploy to Vercel

### 2.1 Connect GitHub Repository

1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import your GitHub repository
5. Select the repository containing your LMS project

### 2.2 Configure Project Settings

**Framework Preset:** Vite
**Root Directory:** `frontend`
**Build Command:** `npm run build`
**Output Directory:** `dist`
**Install Command:** `npm install`

### 2.3 Environment Variables

Add the following environment variables in Vercel dashboard:

```
VITE_BACKEND_URL=https://your-windows-server-domain.com
VITE_APP_ENV=production
VITE_APP_NAME=LMS Platform
```

### 2.4 Deploy

Click "Deploy" and wait for the build to complete.

## Step 3: Configure Custom Domain (Optional)

### 3.1 Add Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### 3.2 DNS Configuration

Add the following DNS records:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.19.19
```

## Step 4: Update Backend CORS

### 4.1 Update CORS Configuration

In your Windows server backend, update the CORS origins to include your Vercel domain:

```python
# In backend/src/app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-vercel-app.vercel.app",
        "https://your-custom-domain.com",
        "http://localhost:3000",  # Keep for development
        "http://localhost:5174",  # Keep for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4.2 Restart Backend Service

```bash
# On Windows server
sc stop LMSPlatform
sc start LMSPlatform
```

## Step 5: Test Deployment

### 5.1 Test Frontend

1. Visit your Vercel deployment URL
2. Test user registration/login
3. Test course creation and management
4. Test file uploads
5. Test all major functionality

### 5.2 Test API Communication

1. Open browser developer tools
2. Check Network tab for API calls
3. Verify no CORS errors
4. Test authentication flow

### 5.3 Test File Uploads

1. Create a course with thumbnail
2. Upload assignment files
3. Verify files are accessible via backend URL

## Step 6: Monitoring and Analytics

### 6.1 Vercel Analytics

Enable Vercel Analytics in your project settings for:
- Page views
- Performance metrics
- Error tracking

### 6.2 Error Monitoring

Consider adding error monitoring services:
- Sentry
- LogRocket
- Bugsnag

## Step 7: Continuous Deployment

### 7.1 Automatic Deployments

Vercel automatically deploys when you push to:
- `main` branch → Production
- Other branches → Preview deployments

### 7.2 Deployment Settings

Configure in Vercel dashboard:
- **Auto-deploy:** Enabled
- **Branch deployments:** Enabled
- **Preview deployments:** Enabled

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Vercel dashboard
   # Common issues:
   # - Missing dependencies
   # - TypeScript errors
   # - Environment variables not set
   ```

2. **CORS Errors**
   ```bash
   # Verify backend CORS configuration
   # Check Vercel domain is in allowed origins
   # Test with browser developer tools
   ```

3. **API Connection Issues**
   ```bash
   # Verify VITE_BACKEND_URL is correct
   # Check backend service is running
   # Test API endpoints directly
   ```

4. **File Upload Issues**
   ```bash
   # Check backend uploads directory permissions
   # Verify Nginx configuration for static files
   # Test file upload endpoints
   ```

### Debug Commands

```bash
# Test API connection
curl https://your-windows-server-domain.com/health

# Check CORS headers
curl -H "Origin: https://your-vercel-app.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-windows-server-domain.com/auth/login
```

## Performance Optimization

### 1. Code Splitting

Ensure your React app uses code splitting:

```javascript
// Use React.lazy for route-based splitting
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
```

### 2. Image Optimization

Use Vercel's image optimization:

```jsx
import Image from 'next/image'

<Image
  src="/course-thumbnail.jpg"
  alt="Course thumbnail"
  width={300}
  height={200}
  priority
/>
```

### 3. Bundle Analysis

Analyze your bundle size:

```bash
npm install --save-dev vite-bundle-analyzer
```

## Security Considerations

1. **Environment Variables**
   - Never commit sensitive data to Git
   - Use Vercel's environment variable system
   - Rotate secrets regularly

2. **Content Security Policy**
   - Add CSP headers in Vercel
   - Restrict external resources

3. **HTTPS Only**
   - Vercel provides HTTPS by default
   - Redirect HTTP to HTTPS

## Backup and Recovery

### 1. Code Backup
- Your code is backed up in GitHub
- Vercel maintains deployment history

### 2. Environment Variables
- Export environment variables from Vercel
- Store securely for disaster recovery

### 3. Database Backup
- Ensure your Windows server database is backed up
- Test restore procedures regularly

## Maintenance

### Regular Tasks

1. **Monitor Performance**
   - Check Vercel analytics
   - Monitor API response times
   - Review error rates

2. **Update Dependencies**
   - Regularly update npm packages
   - Test updates in development first
   - Deploy updates during low-traffic periods

3. **Security Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

### Update Process

```bash
# 1. Update dependencies locally
npm update

# 2. Test locally
npm run dev
npm run build

# 3. Commit and push
git add .
git commit -m "Update dependencies"
git push origin main

# 4. Vercel automatically deploys
# 5. Test production deployment
```

## Support and Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
