import { useEffect } from "react";

const CHATWOOT_BASE_URL = "https://suporte.mediocrescan.com";
const CHATWOOT_WEBSITE_TOKEN = "gAaHYgsP6jLh8rKZNXSNaxKB";

declare global {
  interface Window {
    chatwootSDK?: { run: (options: { websiteToken: string; baseUrl: string }) => void };
    $chatwoot?: Record<string, unknown>;
  }
}

/**
 * Chat de suporte (Chatwoot). Carregado apenas no navegador, após a hidratação,
 * para cada visitante ter sua própria conversa.
 */
export function SupportChat() {
  useEffect(() => {
    if (window.chatwootSDK || document.getElementById("chatwoot-sdk-script")) return;

    const script = document.createElement("script");
    script.id = "chatwoot-sdk-script";
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.defer = true;
    script.async = true;
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      });
    };
    document.body.appendChild(script);
  }, []);

  return null;
}
