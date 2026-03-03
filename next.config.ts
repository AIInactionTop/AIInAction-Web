import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://avatars.githubusercontent.com/**"),
      new URL("https://pub-7adf1f0d8fd24aa3a71e5a649d59ede3.r2.dev/**"),
      new URL("https://pub-12c59a57d0bb4735b6fd348f5deb2eea.r2.dev/**"),
    ],
  },
};

export default withNextIntl(nextConfig);
