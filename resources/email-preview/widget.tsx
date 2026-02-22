import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useState } from "react";
import { Link } from "react-router";
import "../styles.css";
import type { EmailPreviewProps } from "./types";
import { propSchema } from "./types";
import { Button } from "@openai/apps-sdk-ui/components/Button";

export const widgetMetadata: WidgetMetadata = {
  description: "Preview and edit a drafted follow-up email before sending",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Drafting email...",
    invoked: "Email draft ready",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getToneInfo(tone: string) {
  switch (tone) {
    case "firm":
      return {
        label: "Firm",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        iconColor: "text-amber-500",
        headerGradient: "from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-900/20 dark:via-orange-900/10",
      };
    case "final-notice":
      return {
        label: "Final Notice",
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        iconColor: "text-red-500",
        headerGradient: "from-red-500/10 via-rose-500/5 to-transparent dark:from-red-900/20 dark:via-rose-900/10",
      };
    default:
      return {
        label: "Friendly",
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        iconColor: "text-emerald-500",
        headerGradient: "from-emerald-500/10 via-green-500/5 to-transparent dark:from-emerald-900/20 dark:via-green-900/10",
      };
  }
}

const EmailPreview: React.FC = () => {
  const { props, isPending } = useWidget<EmailPreviewProps>();
  const {
    callTool: confirmSend,
    isPending: isSending,
  } = useCallTool<{
    connectionId: string;
    invoiceId: string;
    to: string;
    subject: string;
    body: string;
  }>("confirm-send-email");

  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  // Initialize editable state from props once loaded
  const [initialized, setInitialized] = useState(false);
  if (!isPending && !initialized && props) {
    setSubject(props.subject);
    setBody(props.body);
    setInitialized(true);
  }

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-3xl p-8">
          <div className="h-4 w-32 rounded bg-default/10 animate-pulse mb-2" />
          <div className="h-6 w-56 rounded bg-default/10 animate-pulse mb-6" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-default/10 animate-pulse" />
            <div className="h-24 w-full rounded bg-default/10 animate-pulse" />
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { invoiceId, customerName, customerEmail, amount, tone, connectionId } = props;
  const toneInfo = getToneInfo(tone);

  if (sent) {
    return (
      <McpUseProvider>
        <AppsSDKUIProvider linkComponent={Link}>
          <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent dark:from-emerald-900/20 dark:via-green-900/10 p-8">
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                  <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-default mb-2">Email Sent Successfully</h3>
                <p className="text-sm text-secondary mb-4">
                  Follow-up for invoice <span className="font-mono font-medium text-default">{invoiceId}</span> sent to
                </p>
                <div className="inline-flex items-center gap-2 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/40 dark:border-white/10">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-default">{customerEmail}</span>
                </div>
              </div>
            </div>
          </div>
        </AppsSDKUIProvider>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="bg-surface-elevated border border-default rounded-3xl overflow-hidden">
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${toneInfo.headerGradient} p-6 pb-5`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 ${toneInfo.iconColor}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-secondary text-sm font-medium">Ledgify</h5>
                  <h2 className="text-xl font-bold text-default">Email Preview</h2>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${toneInfo.badgeClass}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" />
                </svg>
                {toneInfo.label}
              </span>
            </div>

            {/* Recipient info card */}
            <div className="rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-default">{customerName}</p>
                    <p className="text-xs text-secondary">{customerEmail}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-default">{formatCurrency(amount)}</p>
                  <p className="text-xs text-secondary font-mono">{invoiceId}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 pt-5">
            {/* Subject */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-2 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Subject
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-surface text-default focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                />
              ) : (
                <p className="text-sm font-medium text-default px-4 py-2.5 rounded-xl border border-default bg-surface">
                  {subject}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-xs font-medium text-secondary mb-2 uppercase tracking-wider">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Message
              </label>
              {isEditing ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 text-sm rounded-xl border-2 border-blue-300 dark:border-blue-700 bg-surface text-default focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-y leading-relaxed transition-all"
                />
              ) : (
                <div className="text-sm text-default px-4 py-3 rounded-xl border border-default bg-surface whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {body}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                color="primary"
                size="md"
                variant="solid"
                disabled={isSending}
                onClick={async () => {
                  await confirmSend({
                    connectionId,
                    invoiceId,
                    to: customerEmail,
                    subject,
                    body,
                  });
                  setSent(true);
                }}
              >
                {isSending ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Email
                  </span>
                )}
              </Button>
              <Button
                color="secondary"
                size="md"
                variant="outline"
                disabled={isSending}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Done
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </span>
                )}
              </Button>
              {isEditing && (
                <Button
                  color="secondary"
                  size="md"
                  variant="outline"
                  onClick={() => {
                    setSubject(props.subject);
                    setBody(props.body);
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default EmailPreview;
