import type { ComponentProps } from "react";
import { sitePath } from "../lib/navigation";
export default function SiteLink({
  href,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  // Native navigation intentionally reads exported HTML, avoiding RSC prefetch/rewrite requirements.
  return <a {...props} href={sitePath(href)} />;
}
