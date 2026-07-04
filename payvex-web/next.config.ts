import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname), // Força o Turbopack a considerar payvex-web como raiz
  },
};

export default nextConfig;
