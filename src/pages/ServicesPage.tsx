import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { ArrowRight, CalendarCheck, MapPin, Phone, Wrench } from 'lucide-react';
import type { BrandConfig } from '../branding/brandConfig';
import { ActionUnavailableNotice } from '../components/ConfigNotice';
import type { PendingTaskSummary, ServiceRequestSummary } from '../types/portal';

interface ServicesPageProps {
  brand: BrandConfig;
  serviceRequests: ServiceRequestSummary[];
  pendingTasks?: PendingTaskSummary[];
  pegaConfigured: boolean;
  startingServiceId?: string | null;
  isPegaReady: boolean;
  onStartService: (request: ServiceRequestSummary) => void;
  onOpenPendingTask?: (task: PendingTaskSummary) => void;
}

const serviceIcon = (id: string) => {
  if (id.includes('address')) return <MapPin size={22} />;
  if (id.includes('contact')) return <Phone size={22} />;
  if (id.includes('review')) return <CalendarCheck size={22} />;
  return <Wrench size={22} />;
};

export function ServicesPage({
  brand,
  serviceRequests,
  pendingTasks = [],
  pegaConfigured,
  startingServiceId,
  isPegaReady,
  onStartService,
  onOpenPendingTask
}: ServicesPageProps) {
  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="h4">{brand.services.title}</Typography>
          <Typography color="text.secondary">{brand.services.subtitle}</Typography>
        </Box>
      </Box>

      {!pegaConfigured && <ActionUnavailableNotice />}
      {pegaConfigured && !isPegaReady && (
        <Box className="inline-note">{brand.services.loading}</Box>
      )}

      <Grid container spacing={2}>
        {serviceRequests.map((request) => (
          <Grid item xs={12} md={6} xl={4} key={request.id}>
            <Card className="content-card">
              <CardContent>
                <Stack spacing={2}>
                  <Box className="card-title-row">
                    <Box className="stat-icon">{serviceIcon(request.id)}</Box>
                    <Chip
                      label={request.status}
                      color={request.status === 'Available' ? 'primary' : 'warning'}
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="h6">{request.title}</Typography>
                    <Typography color="text.secondary">{request.description}</Typography>
                  </Box>
                  {request.dueDate && (
                    <Typography variant="body2" color="warning.main">
                      Due {request.dueDate}
                    </Typography>
                  )}
                  <Button
                    variant="outlined"
                    endIcon={<ArrowRight size={18} />}
                    disabled={!pegaConfigured || (!isPegaReady && request.id !== 'srv-contact') || startingServiceId === request.id}
                    onClick={() => onStartService(request)}
                  >
                    {startingServiceId === request.id ? brand.services.starting : brand.services.startRequest}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
