import { FormEvent, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import type { BrandConfig } from '../branding/brandConfig';

interface LoginPageProps {
  brand: BrandConfig;
  onLogin: (username: string, password: string) => Promise<void>;
  error?: string | null;
}

export function LoginPage({ brand, onLogin, error }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ChipIcon = ShieldCheck;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await onLogin(username, password);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="login-page">
      <Box className="login-hero">
        <Box className="login-theme-row">
          <Chip className="hero-chip" icon={<ChipIcon size={16} />} label={brand.loginChip} />
        </Box>
        <Typography variant="h2" className="login-title">
          {brand.loginTitle}
        </Typography>
        <Typography className="login-copy">
          {brand.loginCopy}
        </Typography>
      </Box>

      <Card className="login-card">
        <CardContent>
          <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h5">Sign in</Typography>
              <Typography color="text.secondary">
                Use your Pega operator username and password.
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Pega username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              fullWidth
              required
            />
            <TextField
              label="Pega password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              type="password"
              fullWidth
              required
            />
            <Button
              size="large"
              variant="contained"
              startIcon={<LockKeyhole size={18} />}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Checking Pega credentials' : 'Enter portal'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
