/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Default to port 8000 — matches the backend server.js PORT default.
    // Override by setting NEXT_PUBLIC_API_URL in .env.local
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

module.exports = nextConfig;
