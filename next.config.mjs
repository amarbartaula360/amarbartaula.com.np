/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/fee",
        destination: "https://uebs-fee-reminder.onrender.com/fee",
      },
      {
        source: "/fee/:path*",
        destination: "https://uebs-fee-reminder.onrender.com/fee/:path*",
      },
    ];
  },
};

export default nextConfig;
