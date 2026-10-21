import { useEffect, useRef, useState } from 'react';
import { 
  Box, Button, Chip, IconButton, Paper, Stack, TextField, 
  Typography, CircularProgress, Link 
} from '@mui/material';
import { Send, X, ExternalLink, Bot, User, Paperclip } from 'lucide-react';
import { createDxClient } from '../services/portalDataService';
import type { PegaAgentAttachment, PegaDxClient } from '../services/pegaDxClient';
import type { PolicySummary } from '../types/portal';
import type { PegaToken } from '../types/pega';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PolicyAIChatProps {
  policy: PolicySummary;
  authToken?: PegaToken;
  customerId?: string | null;
  onClose?: () => void;
}

const AGENT_ID =
  import.meta.env.VITE_PEGA_POLICY_AGENT_ID || 'IH-INSURE-WORK-POLICYCLARIFICATION!POLICYQUESTION';
const MAX_CHAT_ATTACHMENTS = 3;
const MAX_CHAT_ATTACHMENT_SIZE_MB = 10;

interface PendingAttachment {
  id: string;
  file: File;
}

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

function buildAgentRequest(
  question: string,
  customerId: string | null | undefined,
  policy: PolicySummary,
  attachments: PegaAgentAttachment[]
) {
  const fullDocumentUrl = policy.documentURL || '';
  const documentId = policy.documentId || (fullDocumentUrl ? fullDocumentUrl.split('/').pop() : '');
  const policyId = policy.id || policy.policyNumber;
  const parameters = {
    CustomerID: customerId || '',
    PolicyID: policyId,
    Document: fullDocumentUrl,
    DocumentID: documentId || fullDocumentUrl,
    DocumentURL: fullDocumentUrl,
    Attachments: attachments,
    ChatQuestionPrompt: question,
  };

  const requestText = [
    question,
    '',
    'Use the following tool parameters for this policy question:',
    `CustomerID: ${parameters.CustomerID}`,
    `PolicyID: ${parameters.PolicyID}`,
    `Document: ${parameters.Document}`,
    `DocumentID: ${parameters.DocumentID}`,
    `DocumentURL: ${parameters.DocumentURL}`,
    ...(attachments.length > 0
      ? [
          'Attachments:',
          ...attachments.map((attachment) => `- ${attachment.name} (${attachment.type}) ID: ${attachment.ID}`)
        ]
      : []),
    `ChatQuestionPrompt: ${parameters.ChatQuestionPrompt}`,
  ].join('\n');

  return { requestText, parameters };
}

export function PolicyAIChat({ policy, authToken, customerId, onClose }: PolicyAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your policy document assistant. I can answer questions about **${policy.title}** using the official document.`
    }
  ]);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dxClient = authToken ? createDxClient(authToken) : null;
  const canUseAI = !!dxClient && !!policy.documentURL;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Generate smart suggested questions from the policy data
  const suggestedQuestions = [
    `What is the deductible on this policy?`,
    `What does the ${policy.title} cover?`,
    `Who are the beneficiaries?`,
    `When does this policy expire and what happens next?`,
    `What is the coverage amount?`,
  ].slice(0, 4);

  const sendQuestion = async (questionText?: string) => {
    const question = (questionText || input).trim();
    if ((!question && pendingAttachments.length === 0) || !dxClient || !canUseAI) return;

    const filesToSend = [...pendingAttachments];
    const userContent = [
      question || 'Please review the attached file.',
      ...filesToSend.map((attachment) => `Attached: ${attachment.file.name}`)
    ].join('\n');
    const userMessage: Message = { role: 'user', content: userContent };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPendingAttachments([]);
    setIsLoading(true);
    setError(null);

    try {
      const uploadedAttachments = await Promise.all(filesToSend.map((attachment) => dxClient.uploadAttachment(attachment.file)));
      const { requestText, parameters } = buildAgentRequest(
        question || 'Please review the attached file.',
        customerId,
        policy,
        uploadedAttachments
      );

      console.log('[PolicyAIChat] Sending to agent with request parameters', {
        agentId: AGENT_ID,
        isNewConversation: !conversationId,
        content: question,
        parameters
      });

      let assistantText = '';

      if (!conversationId) {
        // First, initiate the conversation to get a convo ID (matches the flow that worked in direct testing)
        const initResponse = await dxClient.initiateAgentConversation(AGENT_ID);
        console.log('[PolicyAIChat] initiateAgentConversation raw response:', initResponse);

        const newConvId = 
          initResponse?.conversationID || 
          initResponse?.ID || 
          initResponse?.conversationId || 
          (initResponse as any)?.data?.conversationID || '';

        if (newConvId) {
          setConversationId(newConvId);
        }

        // Then send the actual question using the streaming PATCH (this is where the SSE response with the answer comes)
        if (newConvId) {
          const streamResult = await dxClient.sendMessageToAgentConversationWithStream(
            AGENT_ID,
            newConvId,
            requestText,
            uploadedAttachments
          );
          assistantText = streamResult.response || '';
        }
      } else {
        // Follow-up: directly send via streaming
        const streamResult = await dxClient.sendMessageToAgentConversationWithStream(
          AGENT_ID,
          conversationId,
          requestText,
          uploadedAttachments
        );
        assistantText = streamResult.response || '';
      }

      if (assistantText) {
        setMessages((prev) => [
          ...prev, 
          { role: 'assistant', content: assistantText }
        ]);
      } else {
        // Fallback if no text came back from stream
        setMessages((prev) => [
          ...prev, 
          { role: 'assistant', content: "I received your question but didn't get a response from the agent yet. Please try again." }
        ]);
      }
    } catch (e) {
      const realError = e instanceof Error ? e.message : String(e);
      console.error('[PolicyAIChat] Agent call failed', {
        agentId: AGENT_ID,
        question,
        attachments: filesToSend.map((attachment) => attachment.file.name),
        error: realError,
        conversationId
      });

      setError(realError);

      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          content: "I'm sorry, I wasn't able to get a response from the agent. Please try again in a moment." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to pull the assistant's reply from different possible API response shapes
  function extractAssistantReply(data: any, fallbackQuestion: string): string {
    if (!data) return "I've received your question. One moment while I review it...";

    // Common shapes from agent responses (A2A / DX API)
    const possible =
      data?.lastResponse ||
      data?.response ||
      data?.message ||
      data?.content ||
      data?.messages?.[data.messages.length - 1]?.content ||
      data?.data?.response ||
      data?.data?.lastResponse;

    if (typeof possible === 'string' && possible.trim().length > 3) {
      return possible;
    }

    // If the backend returned the conversation with multiple messages
    if (Array.isArray(data?.messages)) {
      const lastAssistant = [...data.messages].reverse().find((m: any) => m.role === 'assistant' || m.sender === 'agent');
      if (lastAssistant?.content) return lastAssistant.content;
    }

    return `Thanks for asking. I'm looking into it for you.`;
  }

  // Poll the conversation until we get a real assistant response (the agent processing can be async)
  async function waitForAgentResponse(
    client: PegaDxClient,
    agentId: string,
    convId: string,
    originalQuestion: string,
    maxAttempts = 20,
    delayMs = 1500
  ) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const data = await client.getAgentConversation(agentId, convId);
        console.log(`[PolicyAIChat] Poll attempt ${attempt + 1} raw data for conv ${convId}:`, data);

        const text = extractAssistantReply(data, originalQuestion);

        // Heuristic: we got a substantial answer (not the default waiting text)
        const lower = (text || '').toLowerCase();
        if (text && text.trim().length > 15 && 
            !lower.includes('one moment') && 
            !lower.includes('review it') && 
            !lower.includes('looking into')) {
          console.log('[PolicyAIChat] Got usable assistant response on poll', attempt + 1);
          return data;
        }
      } catch (e) {
        console.warn('[PolicyAIChat] Poll attempt failed', e);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // Return whatever we have on the last attempt
    console.log('[PolicyAIChat] Polling exhausted, returning last data');
    return await client.getAgentConversation(agentId, convId);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const handleSuggestedClick = (q: string) => {
    sendQuestion(q);
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_CHAT_ATTACHMENTS - pendingAttachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_CHAT_ATTACHMENTS} files per message.`);
      return;
    }

    const maxBytes = MAX_CHAT_ATTACHMENT_SIZE_MB * 1024 * 1024;
    const acceptedFiles = selectedFiles
      .filter((file) => {
        if (file.size > maxBytes) {
          setError(`${file.name} is larger than ${MAX_CHAT_ATTACHMENT_SIZE_MB} MB.`);
          return false;
        }
        return true;
      })
      .slice(0, remainingSlots);

    if (acceptedFiles.length < selectedFiles.length && selectedFiles.length > remainingSlots) {
      setError(`Only ${MAX_CHAT_ATTACHMENTS} files can be attached per message.`);
    }

    setPendingAttachments((current) => [
      ...current,
      ...acceptedFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file
      }))
    ]);
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const documentName = policy.documentId || 
    (policy.documentURL ? policy.documentURL.split('/').pop() : 'Policy Document');

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 2.5, py: 1.5, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: 'grey.50'
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ 
            width: 32, height: 32, 
            borderRadius: '50%', 
            bgcolor: 'primary.main', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white'
          }}>
            <Bot size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>
              Document AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {policy.title} • {policy.policyNumber}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center">
          {policy.documentURL && (
            <Button
              size="small"
              variant="text"
              endIcon={<ExternalLink size={14} />}
              href={policy.documentURL}
              target="_blank"
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              Open PDF
            </Button>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <X size={18} />
            </IconButton>
          )}
        </Stack>
      </Box>

      {/* Grounding info */}
      <Box sx={{ px: 2.5, py: 1, bgcolor: 'primary.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="primary.main" fontWeight={500}>
          Grounded in: <strong>{documentName}</strong>
        </Typography>
      </Box>

      {/* Messages */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2.5, 
        bgcolor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {messages.map((msg, index) => (
          <Stack 
            key={index} 
            direction={msg.role === 'user' ? 'row-reverse' : 'row'} 
            spacing={1}
            alignItems="flex-start"
          >
            {msg.role === 'assistant' && (
              <Box sx={{ 
                width: 26, height: 26, 
                borderRadius: '50%', 
                bgcolor: 'primary.main', 
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.5
              }}>
                <Bot size={14} />
              </Box>
            )}
            
            <Paper 
              elevation={0}
              sx={{
                p: 1.5,
                maxWidth: '82%',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                boxShadow: msg.role === 'user' ? 'none' : '0 1px 2px rgba(0,0,0,0.06)',
                whiteSpace: 'pre-wrap'
              }}
            >
              <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                {msg.content}
              </Typography>
            </Paper>

            {msg.role === 'user' && (
              <Box sx={{ 
                width: 26, height: 26, 
                borderRadius: '50%', 
                bgcolor: 'grey.300',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                mt: 0.5
              }}>
                <User size={14} />
              </Box>
            )}
          </Stack>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 0.5 }}>
            <Box sx={{ 
              width: 26, height: 26, 
              borderRadius: '50%', 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={14} />
            </Box>
            <Paper sx={{ 
              px: 2, py: 1, 
              borderRadius: '16px 16px 16px 4px',
              bgcolor: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="body2" color="text.secondary">Thinking...</Typography>
              <CircularProgress size={14} thickness={6} />
            </Paper>
          </Stack>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested questions (only at the beginning) */}
      {messages.length <= 2 && canUseAI && (
        <Box sx={{ px: 2.5, pb: 1.5, pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Try asking:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {suggestedQuestions.map((q, i) => (
              <Chip
                key={i}
                label={q}
                size="small"
                variant="outlined"
                onClick={() => handleSuggestedClick(q)}
                sx={{ 
                  fontSize: '0.75rem', 
                  height: 28,
                  '&:hover': { bgcolor: 'primary.50' }
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Input */}
      {/* Technical error (visible so you can debug) */}
      {error && (
        <Box sx={{ px: 2, py: 1, bgcolor: 'error.light', color: 'error.dark', fontSize: '0.75rem' }}>
          <strong>Technical error:</strong> {error}
        </Box>
      )}

      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        {pendingAttachments.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {pendingAttachments.map((attachment) => (
              <Chip
                key={attachment.id}
                icon={<Paperclip size={14} />}
                label={`${attachment.file.name} (${formatFileSize(attachment.file.size)})`}
                onDelete={() => removeAttachment(attachment.id)}
                size="small"
                variant="outlined"
              />
            ))}
          </Stack>
        )}
        <Stack direction="row" spacing={1}>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            multiple
            onChange={handleAttachmentChange}
          />
          <IconButton
            color="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canUseAI || isLoading || pendingAttachments.length >= MAX_CHAT_ATTACHMENTS}
            sx={{
              width: 44,
              height: 44,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Paperclip size={18} />
          </IconButton>
          <TextField
            fullWidth
            size="small"
            placeholder={canUseAI ? "Ask anything about this policy..." : "AI not available"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canUseAI || isLoading}
            multiline
            maxRows={3}
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 3,
                bgcolor: 'grey.50'
              }
            }}
          />
          <IconButton 
            color="primary" 
            onClick={() => sendQuestion()} 
            disabled={!canUseAI || (!input.trim() && pendingAttachments.length === 0) || isLoading}
            sx={{ 
              width: 44, height: 44, 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500' }
            }}
          >
            {isLoading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
          </IconButton>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', textAlign: 'center' }}>
          Answers are grounded in your actual policy document
        </Typography>
      </Box>
    </Paper>
  );
}
