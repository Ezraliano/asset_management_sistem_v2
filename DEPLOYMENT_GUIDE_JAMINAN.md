# 🚀 Deployment Guide - Aplikasi Jaminan ke Production

## 📋 Daftar Isi
1. [Quick Diagnosis](#quick-diagnosis)
2. [Fix API Connection](#fix-api-connection)
3. [Fix Static Assets](#fix-static-assets)
4. [Fix Tailwind CSS](#fix-tailwind-css)
5. [Environment Configuration](#environment-configuration)
6. [Complete Setup Guide](#complete-setup-guide)
7. [Testing Checklist](#testing-checklist)

---

## 🔍 Quick Diagnosis

Error yang Anda alami:

```
❌ Failed to load resource: the server responded with a status of 404
❌ net::ERR_CONNECTION_REFUSED (API tidak bisa diakses)
❌ Failed to fetch (CORS/Network issue)
❌ /vite.svg 404
❌ /index.css 404
⚠️ cdn.tailwindcss.com should not be used in production
```

**Root Cause:**
- Frontend masih menggunakan `127.0.0.1:8000` (localhost) untuk API
- Assets static tidak ter-serve dengan benar
- Build belum siap untuk production

---

## 🔌 Fix API Connection

### Step 1: Buat `.env.production` File

Buat file di `frontend/.env.production`:

```env
# Production Environment Variables
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_PORT=443
VITE_APP_NAME=Asset Management System

# Atau jika masih di server yang sama:
# VITE_API_BASE_URL=http://your-server-ip:8000
# VITE_API_BASE_URL=http://your-domain.com/api
```

### Step 2: Update `frontend/services/api.ts`

Cari baris dengan `API_BASE_URL` dan ubah menjadi:

```typescript
// BEFORE (hardcoded):
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// AFTER (environment-based):
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api`;
```

Atau lebih lengkap:

```typescript
// Get API base URL from environment or use fallback
const getApiBaseUrl = (): string => {
  // Production
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_BASE_URL || window.location.origin;
  }
  // Development
  return import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
};

const API_BASE_URL = `${getApiBaseUrl()}/api`;

console.log('[API Config] Base URL:', API_BASE_URL);
```

### Step 3: Update `vite.config.ts`

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // Add CORS proxy untuk development (optional)
      server: {
        proxy: {
          '/api': {
            target: env.VITE_API_BASE_URL || 'http://localhost:8000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          }
        }
      }
    };
});
```

---

## 📁 Fix Static Assets

### Problem
Assets seperti `/vite.svg`, `/index.css` tidak ditemukan saat build

### Solution

#### Option 1: Update `index.html`

```html
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Asset Management System - Jaminan</title>

    <!-- Tailwind CSS akan di-inject otomatis oleh Vite -->
    <!-- Jangan gunakan CDN di production! -->

    <!-- Favicon (opsional) -->
    <link rel="icon" href="/public/favicon.ico" />

    <!-- Apple Touch Icon -->
    <link rel="apple-touch-icon" href="/public/apple-touch-icon.png" />
  </head>
  <body class="bg-light-bg">
    <div id="root"></div>
    <!-- Vite akan inject script otomatis -->
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

#### Option 2: Perbaiki Build Output

Update `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Set true untuk debugging
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'recharts': ['recharts'],
          'xlsx': ['xlsx']
        }
      }
    }
  }
});
```

#### Option 3: Setup Public Folder

Buat folder `frontend/public/` dan taruh assets di sana:

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── vite.svg
│   └── robots.txt
├── src/
├── index.html
├── vite.config.ts
└── ...
```

---

## 🎨 Fix Tailwind CSS

### Problem
Production tidak boleh menggunakan CDN Tailwind

### Solution

#### Step 1: Install Tailwind CSS

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Step 2: Buat `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3B82F6',
        'primary-dark': '#2563EB',
        'secondary': '#10B981',
        'light-bg': '#F9FAFB',
        'dark-text': '#1F2937',
        'medium-text': '#6B7280'
      }
    },
  },
  plugins: [],
}
```

#### Step 3: Buat `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom variables */
:root {
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-secondary: #10B981;
  --color-light-bg: #F9FAFB;
  --color-dark-text: #1F2937;
  --color-medium-text: #6B7280;
}

/* Global styles */
body {
  @apply bg-light-bg text-dark-text;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### Step 4: Update `index.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import CSS di sini

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

#### Step 5: Update `index.html`

```html
<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Asset Management System</title>
    <!-- HAPUS CDN Tailwind! -->
    <!-- JANGAN: <script src="https://cdn.tailwindcss.com"></script> -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

---

## ⚙️ Environment Configuration

### Development (`.env.development`)
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_PORT=8000
VITE_ENV=development
```

### Production (`.env.production`)
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_PORT=443
VITE_ENV=production
```

### Staging (`.env.staging`)
```env
VITE_API_BASE_URL=https://staging-api.yourdomain.com
VITE_API_PORT=443
VITE_ENV=staging
```

---

## 📝 Complete Setup Guide

### 1. Backend Setup (Laravel)

```bash
# Backend directory
cd /path/to/backend

# Install dependencies
composer install

# Copy env file
cp .env.example .env

# Generate APP_KEY
php artisan key:generate

# Set database credentials di .env
# DB_HOST=localhost
# DB_DATABASE=asset_management
# DB_USERNAME=root
# DB_PASSWORD=

# Run migrations (termasuk jaminan)
php artisan migrate
php artisan migrate --path=database/migrations_jaminan

# Start Laravel server
php artisan serve --host=0.0.0.0 --port=8000
```

### 2. Frontend Setup

```bash
# Frontend directory
cd /path/to/frontend

# Install dependencies
npm install

# Create .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=http://your-server-ip:8000
VITE_API_PORT=8000
VITE_ENV=production
EOF

# Build untuk production
npm run build

# Output akan ada di dist/
```

### 3. Serve Frontend

#### Option A: Menggunakan Node.js Server

```bash
# Install serve
npm install -g serve

# Serve production build
serve -s dist -l 3000

# Atau di port 80
sudo serve -s dist -l 80
```

#### Option B: Menggunakan Nginx

```nginx
# /etc/nginx/sites-available/jaminan.conf

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP ke HTTPS
    # return 301 https://$server_name$request_uri;

    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/jaminan.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Option C: Menggunakan Apache

```apache
# /etc/apache2/sites-available/jaminan.conf

<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/frontend/dist

    # Enable mod_rewrite
    <Directory /path/to/frontend/dist>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]

        # Allow direct access to files
        <FilesMatch "\.">
            Order allow,deny
            Allow from all
        </FilesMatch>
    </Directory>

    # Proxy API requests
    ProxyPreserveHost On
    ProxyPass /api http://localhost:8000/api
    ProxyPassReverse /api http://localhost:8000/api

    # Cache control
    <FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>

    ErrorLog ${APACHE_LOG_DIR}/jaminan_error.log
    CustomLog ${APACHE_LOG_DIR}/jaminan_access.log combined
</VirtualHost>
```

Enable site:
```bash
sudo a2enmod rewrite
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2ensite jaminan.conf
sudo apache2ctl configtest
sudo systemctl restart apache2
```

---

## ✅ Testing Checklist

Sebelum go-live, test semua ini:

### API Connectivity
- [ ] Backend API dapat diakses dari frontend
- [ ] Login berhasil
- [ ] Token authentication working
- [ ] API calls return proper data
- [ ] Error handling working

### Frontend UI
- [ ] Dashboard Jaminan muncul dengan benar
- [ ] Semua komponen jaminan loading
- [ ] Chart dan statistik tampil
- [ ] Search dan filter berfungsi
- [ ] CRUD operations work (Add, Edit, Delete)
- [ ] Export ke Excel/PDF working

### Performance
- [ ] Page load time < 3 detik
- [ ] No console errors
- [ ] Assets compressed properly
- [ ] Bundle size reasonable
- [ ] Cache headers set correctly

### Security
- [ ] HTTPS enabled (untuk production)
- [ ] CORS configured properly
- [ ] Input validation working
- [ ] No sensitive data in logs
- [ ] Database credentials tidak exposed

### Cross-browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Network Conditions
- [ ] Test dengan slow 3G
- [ ] Test dengan offline mode
- [ ] Test dengan high latency

---

## 🐛 Troubleshooting

### Error: Cannot GET /

**Cause:** Routing tidak configured di server
**Fix:** Pastikan semua routes di-rewrite ke index.html

```nginx
# Nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

```apache
# Apache
RewriteRule . /index.html [L]
```

### Error: net::ERR_CONNECTION_REFUSED

**Cause:** Backend API tidak accessible
**Fix:**
```bash
# Check if backend is running
curl http://localhost:8000/api/health

# Atau check dengan wget
wget -O- http://localhost:8000/api/health
```

### Error: CORS policy: No 'Access-Control-Allow-Origin' header

**Cause:** Backend tidak configure CORS
**Fix:** Update `config/cors.php` di Laravel:

```php
'allowed_origins' => ['http://localhost:3000', 'https://yourdomain.com'],
'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

### Error: 404 on assets after page refresh

**Cause:** Server tidak serve SPA properly
**Fix:** Configure server untuk fallback ke index.html:

```bash
# Nginx
try_files $uri $uri/ /index.html;

# Apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Error: vite.svg 404

**Cause:** Asset tidak ada
**Fix:** Hapus reference dari index.html atau letakkan di public folder

---

## 📊 Production Deployment Checklist

### Pre-Deployment
- [ ] Update API URLs di environment
- [ ] Build production bundle
- [ ] Test locally dengan build output
- [ ] Minify & optimize semua assets
- [ ] Setup database backups

### Deployment
- [ ] Deploy backend code
- [ ] Run migrations
- [ ] Deploy frontend dist folder
- [ ] Configure web server
- [ ] Setup SSL certificate
- [ ] Test semua endpoints

### Post-Deployment
- [ ] Monitor error logs
- [ ] Check API responses
- [ ] Verify all features working
- [ ] Test user workflows
- [ ] Monitor performance metrics

---

**Last Updated:** 2024-11-27
**Version:** 1.0

