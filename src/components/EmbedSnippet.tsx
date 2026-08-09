"use client";

import { useState } from "react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://milostocks.com";

export default function EmbedSnippet({ ticker }: { ticker: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe src="${SITE_URL}/embed/${ticker}" width="280" height="130" frameborder="0" style="border:none;"></iframe>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <details className="rounded-xl border border-border bg-bg-secondary p-4 text-xs text-text-muted">
      <summary className="cursor-pointer text-sm text-text-secondary">Embed this on your site</summary>
      <div className="mt-3 flex flex-col gap-2">
        <code className="mono block overflow-x-auto whitespace-pre rounded-lg border border-border bg-bg-primary p-3 text-text-secondary">
          {snippet}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent hover:text-accent"
        >
          {copied ? "Copied!" : "Copy embed code"}
        </button>
      </div>
    </details>
  );
}
