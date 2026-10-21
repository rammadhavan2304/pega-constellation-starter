import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import { Settings } from 'lucide-react';

interface ConfigNoticeProps {
  configured: boolean;
}

export function ConfigNotice({ configured }: ConfigNoticeProps) {
  if (configured) {
    return (
      <Alert severity="success" variant="outlined">
        <AlertTitle>Pega DX API configured</AlertTitle>
        Portal actions will call the configured Pega Infinity 25 application.
      </Alert>
    );
  }

  return (
    <Alert
      severity="warning"
      variant="outlined"
      action={
        <Button color="inherit" size="small" startIcon={<Settings size={16} />} disabled>
          Configure
        </Button>
      }
    >
      <AlertTitle>Running with mock data</AlertTitle>
      Add values to `.env` from `.env.example` to enable Pega DX API actions.
    </Alert>
  );
}

export function ActionUnavailableNotice() {
  return (
    <Stack className="inline-note">
      Pega is not configured yet. The portal remains usable with mock data, and this action will be enabled when DX API settings are added.
    </Stack>
  );
}
