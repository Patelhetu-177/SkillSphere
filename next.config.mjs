/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
    images: {
        domains: [
            "res.cloudinary.com"
        ]
    },
    webpack: (config, { isServer }) => {
        // Add path aliases
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': path.resolve(__dirname, './'),
            '@/components': path.resolve(__dirname, './components'),
            '@/lib': path.resolve(__dirname, './lib'),
            '@/hooks': path.resolve(__dirname, './hooks'),
            '@/app': path.resolve(__dirname, './app')
        };
        return config;
    }
};

export default nextConfig;
