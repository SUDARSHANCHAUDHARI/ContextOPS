/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@contextops/storage"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
