/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  webpack: (config) => {
    // Add a fallback for the missing PDF.js file
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js': path.join(
        process.cwd(),
        'node_modules',
        'pdfjs-dist',
        'legacy',
        'build',
        'pdf.js'
      )
    };
    return config;
  },
  images: {
    domains: [
      "res.cloudinary.com"
    ]
  }
};

export default nextConfig;