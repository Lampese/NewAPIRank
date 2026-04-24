export interface Provider {
  name: string;
  icon: string; // SVG inner content (paths, shapes, text) — rendered inline with fill="currentColor"
  color: string;
  viewBox?: string; // defaults to "0 0 24 24"
}

// OpenAI logo (simplified)
const openaiIcon = `<path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>`;

// Anthropic logo (wordmark "A" style)
const anthropicIcon = `<path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.47-3.976H5.69l-1.461 3.976H.656L6.569 3.52zm.637 10.065h4.78L9.596 6.282l-2.39 7.303z"/>`;

// Google Gemini sparkle (thicker for small UI usage)
const geminiIcon = `<path d="M12 1.5c.42 0 .8.27.93.68l1.54 4.86a3 3 0 0 0 1.95 1.95l4.86 1.54a.98.98 0 0 1 0 1.87l-4.86 1.54a3 3 0 0 0-1.95 1.95l-1.54 4.86a.98.98 0 0 1-1.87 0l-1.54-4.86a3 3 0 0 0-1.95-1.95l-4.86-1.54a.98.98 0 0 1 0-1.87l4.86-1.54a3 3 0 0 0 1.95-1.95l1.54-4.86c.13-.41.51-.68.93-.68Z"/>`;

// DeepSeek logo
const deepseekIcon = `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-3.07c-1.84-.26-3.27-1.31-3.87-2.72l1.8-.78c.39.93 1.29 1.57 2.07 1.57v-3.2C8.6 8.6 7.5 7.5 7.5 5.96 7.5 4.34 8.94 3 11 3v1.5c-.83 0-1.5.54-1.5 1.46 0 .81.63 1.34 1.5 1.65V4.5h2v3.15c1.56.36 2.72 1.31 3.15 2.58l-1.82.72c-.27-.72-.93-1.26-1.33-1.45v3.3c2.43.67 3.5 1.77 3.5 3.37 0 1.78-1.5 3.33-3.5 3.33zm0-1.5c.93 0 1.5-.64 1.5-1.46 0-.72-.5-1.21-1.5-1.57z"/>`;

// Meta infinity logo
const metaIcon = `<path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a4.892 4.892 0 0 0 1.116 2.01c.35.36.78.53 1.233.53.544 0 1.17-.286 1.812-.943.69-.707 1.456-1.8 2.312-3.31l.535-.946c1.036-1.83 1.881-3.098 2.711-3.87.828-.77 1.674-1.11 2.573-1.11 1.37 0 2.49.702 3.31 1.992.847 1.332 1.3 3.168 1.3 5.225 0 1.24-.163 2.322-.468 3.18H24v-3.18C24 9.168 20.64 4.03 16.502 4.03c-1.37 0-2.553.472-3.563 1.32-1.007.846-1.93 2.133-2.828 3.928l-.535.946c-.86 1.52-1.524 2.5-2.04 3.05-.513.545-.887.703-1.157.703-.263 0-.46-.1-.637-.32a2.394 2.394 0 0 1-.444-.986 6.684 6.684 0 0 1-.12-1.222c0-2.145.558-4.394 1.523-5.958.466-.755.973-1.32 1.487-1.663C8.706 4.491 9.2 4.36 9.657 4.36c.478 0 .984.178 1.535.596l1.602-2.078C11.813 4.231 10.655 4.03 9.657 4.03c-.93 0-1.86.258-2.742.774z"/>`;

// Mistral logo (simplified grid pattern)
const mistralIcon = `<rect x="1" y="3" width="4" height="4" rx="0.5"/><rect x="10" y="3" width="4" height="4" rx="0.5"/><rect x="19" y="3" width="4" height="4" rx="0.5"/><rect x="1" y="10" width="4" height="4" rx="0.5"/><rect x="5.5" y="10" width="4" height="4" rx="0.5"/><rect x="10" y="10" width="4" height="4" rx="0.5"/><rect x="14.5" y="10" width="4" height="4" rx="0.5"/><rect x="19" y="10" width="4" height="4" rx="0.5"/><rect x="1" y="17" width="4" height="4" rx="0.5"/><rect x="10" y="17" width="4" height="4" rx="0.5"/><rect x="19" y="17" width="4" height="4" rx="0.5"/>`;

// MiniMax "M" lettermark
const minimaxIcon = `<path d="M3 18V6l4.5 6L12 6l4.5 6L21 6v12h-2.5V11l-2 2.667L12 8.333l-4.5 5.334-2-2.667V18z"/>`;

// Cohere dot
const cohereIcon = `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4" fill="none"/>`;

// Grok/xAI logo
const xaiIcon = `<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>`;

// Moonshot / Kimi logo (crescent-style mark for small-size display)
const moonshotIcon = `<path d="M12.85 2.25c-4.92 0-8.9 3.98-8.9 8.89 0 5.42 4.43 9.86 9.95 9.86 3.29 0 6.13-1.48 7.9-4.05-1.03.37-1.97.55-2.92.55-4.91 0-8.89-3.98-8.89-8.89 0-2.25.85-4.39 2.86-6.36ZM16.7 5.05c1.48.22 2.66 1.4 2.88 2.88.04.24.39.24.43 0 .22-1.48 1.4-2.66 2.88-2.88.24-.04.24-.39 0-.43-1.48-.22-2.66-1.4-2.88-2.88-.04-.24-.39-.24-.43 0-.22 1.48-1.4 2.66-2.88 2.88-.24.04-.24.39 0 .43Z"/>`;

const providers: { prefixes: string[]; provider: Provider }[] = [
  {
    prefixes: ["gpt-", "o1-", "o3-", "o4-", "chatgpt-"],
    provider: {
      name: "OpenAI",
      icon: openaiIcon,
      color: "#10a37f",
    },
  },
  {
    prefixes: ["claude-"],
    provider: {
      name: "Anthropic",
      icon: anthropicIcon,
      color: "#d97757",
    },
  },
  {
    prefixes: ["gemini-", "gemma-"],
    provider: {
      name: "Google",
      icon: geminiIcon,
      color: "#4285f4",
    },
  },
  {
    prefixes: ["deepseek-"],
    provider: {
      name: "DeepSeek",
      icon: deepseekIcon,
      color: "#4d6bfe",
    },
  },
  {
    prefixes: ["llama-"],
    provider: {
      name: "Meta",
      icon: metaIcon,
      color: "#0668e1",
    },
  },
  {
    prefixes: ["mistral-", "mixtral-", "codestral-", "pixtral-"],
    provider: {
      name: "Mistral",
      icon: mistralIcon,
      color: "#f7d046",
    },
  },
  {
    prefixes: ["minimax-", "abab-"],
    provider: {
      name: "MiniMax",
      icon: minimaxIcon,
      color: "#00d1b2",
    },
  },
  {
    prefixes: ["command-"],
    provider: {
      name: "Cohere",
      icon: cohereIcon,
      color: "#39594d",
    },
  },
  {
    prefixes: ["grok-"],
    provider: {
      name: "xAI",
      icon: xaiIcon,
      color: "#111827",
    },
  },
  {
    prefixes: ["kimi-", "moonshotai/", "moonshot-"],
    provider: {
      name: "Moonshot",
      icon: moonshotIcon,
      color: "#38bdf8",
    },
  },
  {
    prefixes: ["qwen-"],
    provider: {
      name: "Qwen",
      icon: `<text x="3" y="18" font-size="16" font-weight="bold" font-family="system-ui">Q</text>`,
      color: "#615EFF",
    },
  },
  {
    prefixes: ["glm-", "chatglm-"],
    provider: {
      name: "ZhiPu",
      icon: `<text x="2" y="18" font-size="14" font-weight="bold" font-family="system-ui">\u667A</text>`,
      color: "#4169E1",
    },
  },
  {
    prefixes: ["yi-"],
    provider: {
      name: "01.AI",
      icon: `<text x="2" y="18" font-size="14" font-weight="bold" font-family="system-ui">01</text>`,
      color: "#00DC82",
    },
  },
  {
    prefixes: ["doubao-"],
    provider: {
      name: "Doubao",
      icon: `<text x="3" y="18" font-size="14" font-weight="bold" font-family="system-ui">\u8C46</text>`,
      color: "#FF6A3D",
    },
  },
];

const defaultProvider: Provider = {
  name: "Other",
  icon: `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="3"/>`,
  color: "#71717a",
};

export function getProvider(modelId: string): Provider {
  const lower = modelId.toLowerCase();
  for (const { prefixes, provider } of providers) {
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) return provider;
    }
  }
  return defaultProvider;
}
