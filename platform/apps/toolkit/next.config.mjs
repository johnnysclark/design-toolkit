/** @type {import('next').NextConfig} */
const nextConfig = {
  // We rely on `tsc`/build type-checking; skip ESLint in CI builds (no eslint config yet).
  eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;
