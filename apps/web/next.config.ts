import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@lures-dcs/ui',
    '@lures-dcs/design-tokens',
    '@lures-dcs/domain',
    '@lures-dcs/api-contracts',
    '@lures-dcs/data-access',
    '@lures-dcs/utils',
  ],
};

export default nextConfig;
