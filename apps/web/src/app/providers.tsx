"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useRef } from "react";

function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    if (typeof window !== "undefined") {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL environment variable is required. " +
          "Add it to .env.local or set it in your deployment environment.",
      );
    }
    // During static generation, return a placeholder — component won't hydrate without JS
    return "https://placeholder.convex.cloud";
  }
  return url;
}

export function Providers({ children }: { children: ReactNode }): React.ReactElement {
  const convexRef = useRef<ConvexReactClient | null>(null);

  if (convexRef.current === null) {
    convexRef.current = new ConvexReactClient(getConvexUrl());
  }

  return <ConvexProvider client={convexRef.current}>{children}</ConvexProvider>;
}
