import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // These packages load document parsers and the PDF.js worker from their own
  // package directories. Keeping them external preserves those runtime files.
  serverExternalPackages: ['mammoth', 'pdf-parse'],
};

export default nextConfig;
