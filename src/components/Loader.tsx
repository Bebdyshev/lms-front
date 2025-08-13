import React from 'react';

interface LoaderProps {
  /** Size variant of the loader */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Animation type */
  animation?: 'spin' | 'pulse' | 'spin-pulse';
  /** Custom CSS classes */
  className?: string;
  /** Custom color (defaults to current text color) */
  color?: string;
  /** Accessibility label */
  label?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12',
  xl: 'w-16 h-16'
};

const animationClasses = {
  spin: 'animate-logo-spin',
  pulse: 'animate-logo-pulse', 
  'spin-pulse': 'animate-logo-spin-pulse'
};

export default function Loader({ 
  size = 'md',
  animation = 'spin-pulse',
  className = '',
  color,
  label = 'Loading...'
}: LoaderProps) {
  const sizeClass = sizeClasses[size];
  const animationClass = animationClasses[animation];
  
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        className={`${sizeClass} ${animationClass}`}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: color }}
      >
        <g transform="translate(0,150) scale(0.1,-0.1)">
          <path
            d="M556 1221 c-8 -13 85 -232 101 -238 22 -9 38 12 62 82 13 36 26 67 30 69 4 3 20 -29 36 -70 29 -70 56 -99 75 -77 19 22 90 227 81 236 -19 19 -38 -3 -65 -77 -16 -42 -31 -76 -36 -76 -4 0 -21 33 -38 73 -25 59 -34 72 -52 72 -19 0 -28 -13 -53 -80 l-30 -79 -14 29 c-7 17 -24 56 -38 88 -23 52 -45 71 -59 48z"
            fill="currentColor"
          />
          <path
            d="M420 1134 c0 -9 23 -43 50 -76 28 -33 50 -64 50 -70 0 -5 -12 -7 -27 -4 -86 16 -136 18 -144 5 -13 -21 -12 -24 42 -89 28 -34 49 -63 47 -66 -3 -2 -44 1 -92 8 -65 8 -90 8 -99 -1 -8 -8 -8 -14 0 -22 12 -12 227 -43 248 -35 25 9 17 35 -32 97 -25 33 -44 61 -42 64 3 2 34 0 69 -5 90 -13 98 -13 105 10 5 15 -12 42 -67 110 -69 84 -108 111 -108 74z"
            fill="currentColor"
          />
          <path
            d="M972 1054 c-61 -81 -70 -98 -61 -115 8 -15 17 -19 42 -14 18 3 53 9 80 14 29 5 47 5 47 -1 0 -5 -20 -36 -45 -68 -49 -63 -52 -72 -32 -89 10 -8 44 -5 128 9 63 11 115 20 117 20 1 0 2 10 2 21 0 20 -4 21 -47 15 -27 -4 -70 -10 -98 -13 l-49 -6 53 66 c39 49 51 72 46 87 -7 23 -6 23 -96 9 -38 -7 -72 -9 -75 -6 -4 3 17 35 45 70 53 67 63 97 34 97 -11 0 -48 -39 -91 -96z"
            fill="currentColor"
          />
          <path
            d="M358 712 c-100 -17 -132 -32 -111 -53 8 -8 34 -7 97 3 47 8 86 11 86 7 0 -5 -20 -35 -45 -68 -49 -64 -52 -73 -32 -90 10 -8 34 -7 91 3 90 16 89 17 21 -73 -43 -56 -53 -91 -26 -91 10 0 91 97 139 166 18 26 19 34 9 48 -12 16 -20 16 -72 7 -113 -21 -114 -20 -54 55 42 53 50 70 42 83 -14 22 -32 22 -145 3z"
            fill="currentColor"
          />
          <path
            d="M997 713 c-15 -14 -5 -37 38 -90 25 -30 45 -58 45 -62 0 -4 -36 -3 -81 3 -66 7 -83 7 -90 -5 -5 -8 -7 -20 -4 -27 10 -26 140 -181 153 -182 31 -1 21 33 -31 97 -31 37 -52 69 -47 71 6 2 42 -1 81 -7 53 -9 75 -9 85 0 21 17 18 27 -24 78 -75 92 -74 84 -12 77 30 -4 75 -10 98 -13 42 -5 44 -4 40 18 -3 22 -10 25 -93 36 -107 14 -149 15 -158 6z"
            fill="currentColor"
          />
          <path
            d="M630 498 c-35 -82 -77 -205 -72 -216 11 -31 37 -2 66 76 17 45 33 82 36 82 3 0 19 -34 35 -75 27 -68 32 -75 55 -73 20 3 29 15 50 70 15 37 29 70 32 73 3 3 21 -31 40 -77 33 -79 59 -106 71 -75 3 7 -16 63 -42 123 -36 85 -52 110 -68 112 -17 3 -25 -6 -41 -50 -11 -29 -25 -66 -32 -83 l-11 -30 -36 83 c-38 87 -63 106 -83 60z"
            fill="currentColor"
          />
        </g>
        <span className="sr-only">{label}</span>
      </svg>
    </div>
  );
}

// Export commonly used loader variants as convenience components
export const LoaderSmall = (props: Omit<LoaderProps, 'size'>) => (
  <Loader {...props} size="sm" />
);

export const LoaderMedium = (props: Omit<LoaderProps, 'size'>) => (
  <Loader {...props} size="md" />
);

export const LoaderLarge = (props: Omit<LoaderProps, 'size'>) => (
  <Loader {...props} size="lg" />
);

export const LoaderXLarge = (props: Omit<LoaderProps, 'size'>) => (
  <Loader {...props} size="xl" />
);
