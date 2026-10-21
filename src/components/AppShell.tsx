import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import { ClipboardList, FileText, Home, LogOut, ShieldCheck, Wrench } from 'lucide-react';
import type { BrandConfig } from '../branding/brandConfig';
import type { PortalTab, UserProfile } from '../types/portal';

interface AppShellProps {
  brand: BrandConfig;
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab) => void;
  onLogout: () => void;
  user: UserProfile;
  children: React.ReactNode;
}

export function AppShell({ brand, activeTab, onTabChange, onLogout, user, children }: AppShellProps) {
  const tabs: Array<{ id: PortalTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: brand.nav.dashboard, icon: <Home size={18} /> },
    { id: 'policies', label: brand.nav.policies, icon: <ShieldCheck size={18} /> },
    { id: 'claims', label: brand.nav.claims, icon: <ClipboardList size={18} /> },
    { id: 'services', label: brand.nav.services, icon: <Wrench size={18} /> }
  ];
  const BrandIcon = FileText;

  return (
    <Box className="app-frame">
      <AppBar position="sticky" elevation={0} color="inherit" className="topbar">
        <Container maxWidth="xl">
          <Toolbar disableGutters className="toolbar">
            <Box className="brand" onClick={() => onTabChange('dashboard')}>
              <Box className="brand-mark">
                <BrandIcon size={22} />
              </Box>
              <Box>
                <Typography variant="h6" className="brand-name">
                  {brand.appName}
                </Typography>
                <Typography variant="caption" className="brand-caption">
                  {brand.portalCaption}
                </Typography>
              </Box>
            </Box>

            <Box className="nav-tabs">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  className={activeTab === tab.id ? 'nav-tab active' : 'nav-tab'}
                  startIcon={tab.icon}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.label}
                </Button>
              ))}
            </Box>

            <Box className="user-actions">
              <Box className="user-copy">
                <Typography variant="body2" fontWeight={800}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {brand.memberSinceLabel} {user.memberSince}
                </Typography>
              </Box>
              <Avatar className="avatar">{user.name.charAt(0)}</Avatar>
              <Tooltip title="Sign out">
                <IconButton onClick={onLogout} aria-label="Sign out">
                  <LogOut size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="xl" className="main-container">
        {children}
      </Container>
    </Box>
  );
}
