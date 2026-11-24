import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {source: '/book', destination: '/inquiry', permanent: true},
      {source: '/supplies', destination: '/materials', permanent: true},
      {source: '/register', destination: '/inquiry', permanent: true},
      {source: '/login', destination: '/admin/login', permanent: true},
    ];
  },
};

export default nextConfig;
