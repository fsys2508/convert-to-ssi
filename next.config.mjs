import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // geo-tz reads binary timezone data files from its package directory.
    // Keep it external so Next.js doesn't bundle it into .next/server.
    serverComponentsExternalPackages: ["geo-tz"],
  },
};

export default withNextIntl(nextConfig);
