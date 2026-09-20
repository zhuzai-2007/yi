import type { NextConfig } from "next";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
if (basePath && !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(basePath))
  throw new Error(
    "NEXT_PUBLIC_BASE_PATH must be empty or an absolute path without a trailing slash.",
  );
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  devIndicators: false,
};
export default config;
