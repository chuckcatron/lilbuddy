"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useRef } from "react";

export function Providers({ children }: { children: ReactNode }): React.ReactElement {
  const convexRef = useRef<ConvexReactClient | null>(null);

  if (convexRef.current === null) {
    convexRef.current = new ConvexReactClient(
      process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud",
    );
  }

  return <ConvexProvider client={convexRef.current}>{children}</ConvexProvider>;
}
