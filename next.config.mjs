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
  async redirects() {
    return [
      {
        source: "/fee",
        destination: "https://uebs-fee-reminder.onrender.com/",
        permanent: false,
      },
      {
        source: "/fee/:path*",
        destination: "https://uebs-fee-reminder.onrender.com/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
