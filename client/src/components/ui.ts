import styled, { css } from 'styled-components';

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

export const PageHeader = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  margin-bottom: ${({ theme }) => theme.space.xl};
`;

export const H1 = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  margin: 0;
`;

export const H2 = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  margin: 0 0 ${({ theme }) => theme.space.md};
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const inputBase = css`
  min-height: 42px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition:
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textFaint};
  }

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.colors.surface};
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
`;

export const Input = styled.input`${inputBase}`;

// Encode the theme's muted color into an inline SVG chevron for <select>.
const chevron = (color: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(
    color,
  )}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`;

export const Select = styled.select`
  ${inputBase}
  appearance: none;
  -webkit-appearance: none;
  padding-right: 30px;
  background-image: ${({ theme }) => chevron(theme.colors.textMuted)};
  background-repeat: no-repeat;
  background-position: right 8px center;
  text-overflow: ellipsis;
  cursor: pointer;
`;

export const TextArea = styled.textarea`
  ${inputBase}
  min-height: 72px;
  resize: vertical;
  width: 100%;
`;

export const Button = styled.button<{ variant?: 'primary' | 'ghost' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  white-space: nowrap;
  transition:
    transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    filter ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ variant, theme }) =>
    variant === 'primary' &&
    css`
      background: ${theme.colors.gradientPrimary};
      color: ${theme.colors.primaryText};
      border-color: transparent;
      box-shadow: ${theme.shadows.xs};

      &:hover:not(:disabled) {
        background: ${theme.colors.gradientPrimary};
        border-color: transparent;
        box-shadow: ${theme.shadows.glowPrimary};
        filter: brightness(1.06);
      }
    `}

  ${({ variant, theme }) =>
    variant === 'danger' &&
    css`
      background: transparent;
      color: ${theme.colors.danger};
      border-color: color-mix(in srgb, ${theme.colors.danger} 45%, transparent);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, ${theme.colors.danger} 10%, transparent);
        border-color: ${theme.colors.danger};
      }
    `}

  ${({ variant, theme }) =>
    variant === 'ghost' &&
    css`
      background: transparent;
      border-color: transparent;

      &:hover:not(:disabled) {
        background: ${theme.colors.surfaceAlt};
        border-color: transparent;
      }
    `}
`;

export const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
`;

export const Stack = styled.div<{ gap?: keyof { xs: 0; sm: 0; md: 0; lg: 0; xl: 0 } }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, gap = 'md' }) => theme.space[gap]};
`;
