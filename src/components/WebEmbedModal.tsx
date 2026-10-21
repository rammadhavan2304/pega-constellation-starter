import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { getPegaConfig } from '../config/pegaConfig';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'pega-embed': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          action?: string;
          caseTypeID?: string;
          themeID?: string;
          casePage?: string;
          assignmentHeader?: string;
          appAlias?: string;
          pegaServerUrl?: string;
          grantType?: string;
          deferLoad?: string;
          authHeader?: string;
          startingFields?: string;
        },
        HTMLElement
      >;
    }
  }
}

interface WebEmbedModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  authHeader: string;
}

export function WebEmbedModal({ open, onClose, customerId, authHeader }: WebEmbedModalProps) {
  const pegaConfig = getPegaConfig();
  const pegaServerUrl = `${(pegaConfig?.baseUrl || '').replace(/\/PRAuth\/?$/i, '').replace(/\/$/, '')}/`;
  const webEmbedScriptUrl = `${pegaServerUrl}PRRestService/c11nsvc/v1/pega-embed.js`;
  const embedId = useRef(`contact-details-embed-${Date.now()}`);
  const embedRef = useRef<HTMLElement | null>(null);
  const startingFields = useMemo(
    () =>
      JSON.stringify({
        IsSelfServe: true,
        CustomerID: customerId
      }),
    [customerId]
  );

  useEffect(() => {
    if (!open) return;

    const loadEmbed = () => {
      window.setTimeout(() => {
        const embed = embedRef.current as HTMLElement & { load?: () => void };
        if (embed?.load) {
          embed.load();
        }
      }, 100);
    };

    const existingScript = document.querySelector(`script[src="${webEmbedScriptUrl}"]`);
    if (existingScript) {
      loadEmbed();
      return;
    }

    const script = document.createElement('script');
    script.src = webEmbedScriptUrl;
    script.async = true;
    script.onload = loadEmbed;
    document.head.appendChild(script);
  }, [open, authHeader, startingFields, webEmbedScriptUrl]);

  useEffect(() => {
    if (!open) return;

    const embed = embedRef.current;
    if (!embed) return;

    // Pega Web Embed emits CustomEvents on the embed element, not window.postMessage events.
    // The submission event is the reliable signal for this one-assignment contact-details flow.
    const closeOnSubmission = () => onClose();
    const closeOnProcessingEnd = () => onClose();
    const closeOnCaseClosed = () => onClose();
    const closeOnCancel = () => onClose();

    embed.addEventListener('embedassignmentsubmission', closeOnSubmission);
    embed.addEventListener('embedprocessingend', closeOnProcessingEnd);
    embed.addEventListener('embedcaseclosed', closeOnCaseClosed);
    embed.addEventListener('embedeventcancel', closeOnCancel);

    return () => {
      embed.removeEventListener('embedassignmentsubmission', closeOnSubmission);
      embed.removeEventListener('embedprocessingend', closeOnProcessingEnd);
      embed.removeEventListener('embedcaseclosed', closeOnCaseClosed);
      embed.removeEventListener('embedeventcancel', closeOnCancel);
    };
  }, [open, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle className="web-embed-title">
        <Box>
          <Typography variant="h6">Update contact details</Typography>
          <Typography variant="body2" color="text.secondary">
            This secure form is opened through Pega Web Embed.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close contact details form">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent className="web-embed-content">
        <pega-embed
          ref={embedRef}
          id={embedId.current}
          action="createCase"
          caseTypeID={pegaConfig?.caseTypes.changeContact || 'IH-Insure-Work-ChangeContactDetails'}
          themeID="pyWebSelfService"
          casePage="assignment"
          assignmentHeader="false"
          appAlias={pegaConfig?.appAlias || 'insurehub'}
          pegaServerUrl={pegaServerUrl}
          grantType="none"
          deferLoad="true"
          authHeader={authHeader}
          startingFields={startingFields}
          style={{ width: '100%', display: 'block', minHeight: '620px' }}
        />
      </DialogContent>
    </Dialog>
  );
}
