/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
  },
  // Server actions are now enabled by default
  experimental: {
    // Removed serverActions as it's enabled by default now
  },
}

module.exports = nextConfig 