// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Build sırasında ESLint hataları deploy'u BLOKLAMASIN
    ignoreDuringBuilds: true,
  },
  // Eğer tip hataları da geçici olarak bloklamasın istersen, açabilirsin:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
