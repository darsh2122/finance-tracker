export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-gradient overflow-hidden">
      {/* Container for the main animation */}
      <div className="relative flex flex-col items-center animate-splash-enter">
        
        {/* Animated Wallet SVG */}
        <div className="relative w-32 h-32 mb-8 animate-float">
          {/* Logo Glow */}
          <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full scale-150"></div>
          
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl"
          >
            {/* Wallet Main Body */}
            <rect
              x="10"
              y="30"
              width="80"
              height="55"
              rx="14"
              fill="url(#wallet-grad)"
              style={{ filter: "url(#clay-filter)" }}
            />
            
            {/* Flap */}
            <path
              d="M10 40Q10 30 20 30L80 30Q90 30 90 40L90 50Q90 60 80 60H20Q10 60 10 50Z"
              fill="url(#flap-grad)"
              style={{ filter: "url(#clay-filter-soft)" }}
            />
            
            {/* Button */}
            <circle
              cx="75"
              cy="45"
              r="6"
              fill="#ffffff"
              style={{ filter: "url(#clay-filter-mini)" }}
            />
            
            {/* Coins peeking out */}
            <circle cx="30" cy="25" r="8" fill="var(--amber-light)" style={{ filter: "url(#clay-filter-mini)" }} opacity="0.8" />
            <circle cx="45" cy="22" r="8" fill="var(--green-light)" style={{ filter: "url(#clay-filter-mini)" }} />

            <defs>
              <linearGradient id="wallet-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--purple)" />
                <stop offset="100%" stopColor="var(--purple-mid)" />
              </linearGradient>
              <linearGradient id="flap-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--purple-light)" />
                <stop offset="100%" stopColor="var(--purple)" />
              </linearGradient>
              
              {/* Proper Clay Filter Simulation */}
              <filter id="clay-filter" x="-20%" y="-20%" width="140%" height="140%">
                {/* Main Shadow */}
                <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="rgba(124, 58, 237, 0.3)" />
                
                {/* Inner Glow (light top-left) */}
                <feComponentTransfer in="SourceGraphic" result="lightSource">
                  <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
                <feOffset dx="0" dy="2" />
                <feComposite operator="out" in="blur" in2="SourceAlpha" result="innerGlow" />
                
                {/* Final Combine */}
                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="innerGlow" />
                </feMerge>
              </filter>
              
              <filter id="clay-filter-soft" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="rgba(0,0,0,0.1)" />
              </filter>

              <filter id="clay-filter-mini" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.1)" />
              </filter>
            </defs>

          </svg>
        </div>

        {/* Brand Text */}
        <h1 className="text-2xl font-black text-purple-900/80 dark:text-purple-100/90 tracking-tight mb-2">
          Finance Tracker
        </h1>
        <p className="text-sm font-bold text-purple-600/60 dark:text-purple-400/60 uppercase tracking-widest mb-8">
          Your wallet's best friend
        </p>

        {/* Progress Bar Container */}
        <div className="w-48 h-2.5 bg-white/30 dark:bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/20 shadow-inner">
          <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-progress"></div>
        </div>
      </div>
      
      {/* Decorative Blobs (optional but nice) */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-pink-300/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-blue-300/20 blur-3xl rounded-full"></div>
    </div>
  );
}

// Simple InnerShadow SVG filter component/snippet isn't built-in, but we can simulate or omit for brevity.
// Since we want high fidelity, let's just use the CSS clay tokens we already have.