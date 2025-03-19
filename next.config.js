const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['your-s3-bucket.s3.amazonaws.com'],
    loader: 'default',
    path: '/_next/image',
  },
  // 启用增量静态生成
  experimental: {
    // 启用AWS Lambda集成的相关配置
    outputFileTracing: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;
