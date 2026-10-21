import { Box, Button, Card, CardContent, Chip, Grid, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { FilePenLine, Home, MessageCircle, ShieldCheck, Stethoscope, WalletCards } from 'lucide-react';
import type { BrandConfig } from '../branding/brandConfig';
import { ActionUnavailableNotice } from '../components/ConfigNotice';
import type { PolicySummary } from '../types/portal';

interface PoliciesPageProps {
  brand: BrandConfig;
  policies: PolicySummary[];
  pegaConfigured: boolean;
  onPolicyChange: (policy: PolicySummary) => void;
  onAskPolicyQuestion?: (policy: PolicySummary) => void;
}

const icons = {
  Auto: <WalletCards size={22} />,
  Home: <Home size={22} />,
  Health: <Stethoscope size={22} />,
  Life: <ShieldCheck size={22} />
};

export function PoliciesPage({ brand, policies, pegaConfigured, onPolicyChange, onAskPolicyQuestion }: PoliciesPageProps) {
  return (
    <Stack spacing={3}>
      <Box className="page-heading">
        <Box>
          <Typography variant="h4">{brand.policies.title}</Typography>
          <Typography color="text.secondary">{brand.policies.subtitle}</Typography>
        </Box>
      </Box>

      {!pegaConfigured && <ActionUnavailableNotice />}

      <Grid container spacing={2}>
        {policies.map((policy) => (
          <Grid item xs={12} md={6} xl={4} key={policy.id}>
            <Card 
              className="content-card"
              sx={{
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                }
              }}
            >
              <CardContent sx={{ position: 'relative' }}>
                <Stack spacing={2}>
                  <Box className="card-title-row">
                    <Box className="stat-icon">{icons[policy.type]}</Box>
                    <Chip label={policy.status} color={policy.status === 'Active' ? 'success' : 'warning'} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="h6">{policy.title}</Typography>
                    <Typography color="text.secondary">{policy.policyNumber}</Typography>
                  </Box>
                  <Box className="detail-grid">
                    <span>Covered</span>
                    <strong>{policy.coveredAsset}</strong>
                    <span>Premium</span>
                    <strong>{policy.premium}</strong>
                    <span>Deductible</span>
                    <strong>{policy.deductible}</strong>
                    <span>Renewal</span>
                    <strong>{policy.renewalDate}</strong>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<FilePenLine size={18} />}
                    disabled={!pegaConfigured}
                    onClick={() => onPolicyChange(policy)}
                    fullWidth
                  >
                    {brand.policies.requestChange}
                  </Button>
                </Stack>

                {/* Chat Bubble - lower right, prominent */}
                {onAskPolicyQuestion && pegaConfigured && (
                  <Tooltip title="Ask anything about this policy?" arrow placement="top">
                    <IconButton
                      size="medium"
                      onClick={() => onAskPolicyQuestion(policy)}
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 16,
                        width: 44,
                        height: 44,
                        bgcolor: 'primary.main',
                        color: 'common.white',
                        boxShadow: 4,
                        opacity: 0.95,
                        transition: 'all 0.2s ease',
                        zIndex: 1,
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          transform: 'scale(1.1)',
                          boxShadow: 8,
                        },
                      }}
                    >
                      <MessageCircle size={20} />
                    </IconButton>
                  </Tooltip>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
