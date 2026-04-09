"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

/**
 * PWASplash Component
 * Uses the iosPWASplash library to generate iOS-specific splash screen meta tags
 * for all iPhone and iPad device sizes on the fly.
 */
export default function PWASplash() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if the script has already loaded and the function is available
    if (typeof window !== "undefined" && (window as any).iosPWASplash && isLoaded) {
      try {
        // Execute the splash screen generator
        // Icon: Path to the high-res 512px icon
        // Color: Brand purple matching the loading animation theme
        (window as any).iosPWASplash("/icon-512.png", "#7c3aed");
        console.log("iOS PWA Splash screens generated successfully.");
      } catch (error) {
        console.error("Error generating iOS PWA Splash screens:", error);
      }
    }
  }, [isLoaded]);

  return (
    <Script
      src="https://cdn.jsdelivr.net/npm/ios-pwa-splash@1.0.0/cdn.min.js"
      onLoad={() => setIsLoaded(true)}
      strategy="afterInteractive"
    />
  );
}
