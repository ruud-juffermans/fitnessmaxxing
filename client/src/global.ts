import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  html {
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.body};
    font-size: ${({ theme }) => theme.fontSizes.md};
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    -webkit-tap-highlight-color: transparent;
  }

  /* Ambient brand glow behind everything — fixed so it doesn't scroll and
     stays subtle on tall pages. */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(
        60% 44% at 50% -8%,
        ${({ theme }) => (theme.mode === 'dark' ? 'rgba(250, 82, 82, 0.10)' : 'rgba(224, 49, 49, 0.06)')},
        transparent 70%
      ),
      radial-gradient(
        44% 36% at 92% 8%,
        ${({ theme }) => (theme.mode === 'dark' ? 'rgba(96, 108, 255, 0.07)' : 'rgba(96, 108, 255, 0.045)')},
        transparent 70%
      );
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.heading};
    letter-spacing: -0.02em;
    text-wrap: balance;
  }

  button {
    font-family: inherit;
    touch-action: manipulation;
  }

  input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }

  /* Native checkboxes pick up the brand color and a touch-friendly size. */
  input[type='checkbox'] {
    accent-color: ${({ theme }) => theme.colors.primary};
    width: 18px;
    height: 18px;
  }

  /* One consistent, soft focus ring everywhere; only for keyboard focus. */
  :focus { outline: none; }
  :focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; }
  a:hover { text-decoration: underline; }

  ::selection {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: inherit;
  }

  /* Slim, unobtrusive scrollbars on desktop. */
  @media (pointer: fine) {
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: ${({ theme }) => theme.colors.borderStrong};
      border-radius: 999px;
      border: 3px solid transparent;
      background-clip: content-box;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${({ theme }) => theme.colors.textFaint};
      border: 3px solid transparent;
      background-clip: content-box;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
