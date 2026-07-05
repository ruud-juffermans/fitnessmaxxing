import type { ReactNode } from 'react';
import styled from 'styled-components';

export function AuthShell({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Wrap>
      <Card>
        <Brand>fitnessmaxxing</Brand>
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
        {children}
      </Card>
      {footer && <Footer>{footer}</Footer>}
    </Wrap>
  );
}

const Wrap = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.background};
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.xl};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Brand = styled.div`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  letter-spacing: -0.02em;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: ${({ theme }) => theme.space.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  margin: 0 0 ${({ theme }) => theme.space.xs};
`;

const Subtitle = styled.p`
  margin: 0 0 ${({ theme }) => theme.space.lg};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
`;

const Footer = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const FormStack = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

export const Alert = styled.div<{ $variant?: 'error' | 'success' }>`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  border: 1px solid
    ${({ theme, $variant }) =>
      $variant === 'success'
        ? `color-mix(in srgb, ${theme.colors.success} 40%, transparent)`
        : `color-mix(in srgb, ${theme.colors.danger} 40%, transparent)`};
  color: ${({ theme, $variant }) => ($variant === 'success' ? theme.colors.success : theme.colors.danger)};
  background: ${({ theme, $variant }) =>
    $variant === 'success'
      ? theme.colors.successSoft
      : `color-mix(in srgb, ${theme.colors.danger} 9%, transparent)`};

  a { color: inherit; font-weight: ${({ theme }) => theme.fontWeights.semibold}; }
`;
