import { useEffect, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { GlobalStyle } from './global';
import { themes, type ThemeMode } from './theme';
import { useAuth } from './auth';
import { Button } from './components/ui';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { Workout } from './pages/Workout';
import { Plans } from './pages/Plans';
import { PlanDetail } from './pages/PlanDetail';
import { Exercises } from './pages/Exercises';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { Users } from './pages/admin/Users';

const THEME_KEY = 'fitnessmaxxing.theme';

export function App() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  return (
    <ThemeProvider theme={themes[mode]}>
      <GlobalStyle />
      {loading ? (
        <Center>Loading…</Center>
      ) : user ? (
        <AuthedApp mode={mode} onToggleTheme={() => setMode(mode === 'dark' ? 'light' : 'dark')} />
      ) : (
        <PublicRoutes />
      )}
    </ThemeProvider>
  );
}

function RedirectToLogin() {
  const location = useLocation();
  const next = `${location.pathname}${location.search}`;
  return <Navigate to={next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login'} replace />;
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="*" element={<RedirectToLogin />} />
    </Routes>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: (props: { active?: boolean }) => JSX.Element;
}

const navItems: NavItem[] = [
  { to: '/workout', label: 'Workout', icon: DumbbellIcon },
  { to: '/plans', label: 'Plans', icon: ClipboardIcon },
  { to: '/exercises', label: 'Exercises', icon: ListIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/stats', label: 'Stats', icon: StatsIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

// The five slots on the mobile tab bar (Exercises lives in the drawer/desktop nav).
const tabItems = navItems.filter((i) => i.to !== '/exercises');

function AuthedApp({ mode, onToggleTheme }: { mode: ThemeMode; onToggleTheme: () => void }) {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const items = user?.role === 'admin' ? [...navItems, { to: '/admin', label: 'Admin', icon: ShieldIcon }] : navItems;

  return (
    <Shell>
      <HeaderGroup>
        <Nav>
          <NavInner>
            <Hamburger aria-label="Menu" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </Hamburger>
            <BrandLink to="/workout">
              <LogoMark aria-hidden>
                <DumbbellIcon />
              </LogoMark>
              <Wordmark>fitnessmaxxing</Wordmark>
            </BrandLink>
            <DesktopLinks>
              {items.map((item) => (
                <TopLink key={item.to} to={item.to}>
                  {item.label}
                </TopLink>
              ))}
            </DesktopLinks>
            <UserArea>
              <UserName>{user?.isGuest ? 'Guest' : user?.name || user?.email}</UserName>
              <IconButton aria-label="Toggle theme" onClick={onToggleTheme}>
                {mode === 'dark' ? <SunIcon /> : <MoonIcon />}
              </IconButton>
              <Button variant="primary" onClick={() => logout()}>
                Sign out
              </Button>
            </UserArea>
          </NavInner>
        </Nav>
        {user?.isGuest && (
          <GuestBanner>
            You're training as a guest — inactive guest data is deleted after 7 days.{' '}
            <Link to="/settings">Create a free account</Link> to keep your workouts.
          </GuestBanner>
        )}
      </HeaderGroup>

      <Drawer $open={drawerOpen}>
        <DrawerHeader>
          <Wordmark>fitnessmaxxing</Wordmark>
        </DrawerHeader>
        {items.map((item) => (
          <DrawerLink key={item.to} to={item.to}>
            <item.icon />
            {item.label}
          </DrawerLink>
        ))}
      </Drawer>
      {drawerOpen && <Overlay onClick={() => setDrawerOpen(false)} />}

      <Main>
        <Routes>
          <Route path="/" element={<Navigate to="/workout" replace />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/:id" element={<PlanDetail />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="/admin"
            element={user?.role === 'admin' ? <Users /> : <Navigate to="/workout" replace />}
          />
          <Route path="/login" element={<Navigate to="/workout" replace />} />
          <Route path="/register" element={<Navigate to="/workout" replace />} />
          <Route path="*" element={<Navigate to="/workout" replace />} />
        </Routes>
      </Main>

      <TabBar>
        {tabItems.map((item) => (
          <TabLink key={item.to} to={item.to}>
            <item.icon />
            <span>{item.label}</span>
          </TabLink>
        ))}
      </TabBar>
    </Shell>
  );
}

/* ---------------------------------- icons --------------------------------- */

function iconProps() {
  return {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
}

function DumbbellIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/* --------------------------------- styles --------------------------------- */

const Shell = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
`;

const Center = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HeaderGroup = styled.div`
  position: sticky;
  top: 0;
  z-index: 40;
`;

const Nav = styled.nav`
  background: color-mix(in srgb, ${({ theme }) => theme.colors.background} 72%, transparent);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const NavInner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
`;

const Hamburger = styled.button`
  display: none;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.space.xs};
  cursor: pointer;

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: inline-flex;
  }
`;

const BrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  text-decoration: none !important;
`;

const LogoMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: #fff;
  box-shadow: ${({ theme }) => theme.shadows.xs};

  svg {
    width: 19px;
    height: 19px;
  }
`;

const Wordmark = styled.span`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  letter-spacing: -0.02em;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
`;

const DesktopLinks = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
  margin-left: ${({ theme }) => theme.space.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    display: none;
  }
`;

const TopLink = styled(NavLink)`
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none !important;
  transition: background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }

  &.active {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UserArea = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const UserName = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  transition: color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
`;

const GuestBanner = styled.div`
  background: ${({ theme }) => theme.colors.gradientPrimary};
  color: #fff;
  text-align: center;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  a {
    color: #fff;
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    text-decoration: underline;
  }
`;

const Drawer = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 270px;
  z-index: 60;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.lg : 'none')};
  transform: translateX(${({ $open }) => ($open ? '0' : '-105%')});
  transition: transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.ease};
  padding: ${({ theme }) => theme.space.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`;

const DrawerHeader = styled.div`
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
`;

const DrawerLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none !important;

  &.active {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: ${({ theme }) => theme.colors.overlay};
`;

const Main = styled.main`
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    /* Leave room for the fixed tab bar. */
    padding-bottom: 96px;
  }
`;

const TabBar = styled.nav`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    background: color-mix(in srgb, ${({ theme }) => theme.colors.surface} 82%, transparent);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.xs}
      calc(${({ theme }) => theme.space.xs} + env(safe-area-inset-bottom));
  }
`;

const TabLink = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textFaint};
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-decoration: none !important;

  svg {
    transition: transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.spring};
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};

    svg {
      transform: translateY(-1px) scale(1.08);
    }
  }
`;
