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
      {
        source: "/mauhba",
        destination: "https://manahari-business-management.onrender.com/mauhba",
      },
      {
        source: "/mauhba/:path*",
        destination: "https://manahari-business-management.onrender.com/mauhba/:path*",
      },
      {
        source: "/api/mauhba/:path*",
        destination: "https://manahari-business-management.onrender.com/api/mauhba/:path*",
      },
    ];
  },
};

export default nextConfig;
