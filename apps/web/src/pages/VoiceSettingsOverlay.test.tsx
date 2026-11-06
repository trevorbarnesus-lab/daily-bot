// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";

const voice = vi.hoisted(() => ({
  catalog: vi.fn(),
  credentials: vi.fn(),
  status: vi.fn(),
  voices: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  setVoice: vi.fn(),
}));

const { speak } = vi.hoisted(() => ({ speak: vi.fn(async () => undefined) }));
vi.mock("../lib/tts.js", () => ({ speaker: { speak, state: {} } }));
vi.mock("../lib/rpc", () => ({
  rpc: { voice },
  rpcForSpace: () => ({ voice }),
  createSpaceRpc: () => ({ voice }),
  selectedSpaceId: () => null,
}));
vi.mock("@lingui/react/macro", () => {
  const t = (parts: TemplateStringsArray) => parts.join("");
  return { useLingui: () => ({ t }), Trans: ({ children }: { children: ReactNode }) => children };
});
vi.mock("@rakazo/ui-web", () => {
  const Container = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Spinner: (props: ComponentProps<"svg">) => <svg role="status" {...props} />,
    Button: ({
      variant: _variant,
      size: _size,
      ...props
    }: ComponentProps<"button"> & { variant?: string; size?: string }) => <button {...props} />,
    Dialog: Container,
    DialogClose: Container,
    DialogContent: Container,
    DialogTitle: Container,
    Field: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    FieldLabel: ({ children, htmlFor }: { children?: ReactNode; htmlFor?: string }) => (
      <label htmlFor={htmlFor}>{children}</label>
    ),
    Input: (props: ComponentProps<"input">) => <input {...props} />,
    NativeSelect: (props: ComponentProps<"select">) => <select {...props} />,
    NativeSelectOption: (props: ComponentProps<"option">) => <option {...props} />,
  };
});

import { SpaceRpcProvider } from "../lib/space-rpc";
import { VoiceSettingsOverlay } from "./VoiceSettingsOverlay";

const openAI = { id: "cred-openai", provider: "openai", voiceId: "alloy" };
const legacy = { id: "cred-legacy", provider: "elevenlabs", voiceId: "rachel" };

beforeEach(() => {
  vi.resetAllMocks();
  voice.catalog.mockResolvedValue([{ id: "openai", name: "OpenAI", transcribe: true }]);
  voice.credentials.mockResolvedValue([]);
  voice.status.mockResolvedValue({ ready: false });
  voice.voices.mockResolvedValue([
    { id: "alloy", label: "Alloy" },
    { id: "marin", label: "Marin" },
  ]);
});

async function inVoiceSettings(
  scope: "account" | "space",
  test: (container: HTMLDivElement) => Promise<void>,
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <SpaceRpcProvider spaceId="space-test">
            <VoiceSettingsOverlay embedded scope={scope} onClose={() => undefined} />
          </SpaceRpcProvider>
        </QueryClientProvider>,
      );
    });
    await test(container);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.unstubAllGlobals();
  }
}

function button(container: HTMLElement, label: string) {
  const match = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label,
  );
  if (!match) throw new Error(`Missing button: ${label}`);
  return match;
}

it("offers an OpenAI key when only an unsupported provider was previously connected", async () => {
  voice.credentials.mockResolvedValue([legacy]);
  voice.status.mockResolvedValue({ ready: true, provider: legacy.provider });
  voice.connect.mockImplementation(async () => {
    voice.credentials.mockResolvedValue([openAI, legacy]);
    return openAI;
  });
  await inVoiceSettings("account", async (container) => {
    const input = container.querySelector('input[type="password"]')!;
    expect(container.querySelector(`label[for="${input.id}"]`)?.textContent).toBe("OpenAI API key");
    expect(container.textContent).not.toContain("ElevenLabs");
    expect(container.textContent).not.toContain("Rachel");
    expect(voice.voices).not.toHaveBeenCalled();
    const connect = button(container, "Connect");
    expect(connect.disabled).toBe(true);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
        input,
        "fake-openai-key",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => connect.click());
    expect(voice.connect).toHaveBeenCalledExactlyOnceWith({
      provider: "openai",
      scope: "account",
      apiKey: "fake-openai-key",
      voiceId: undefined,
    });
    expect(voice.voices).toHaveBeenCalledExactlyOnceWith(
      { provider: "openai", scope: "account" },
      expect.anything(),
    );
    expect(container.querySelector('input[type="password"]')?.getAttribute("placeholder")).toBe(
      "Paste a replacement key",
    );
  });
});

it("keeps a Space's voice choice separate from the shared OpenAI key", async () => {
  voice.credentials.mockResolvedValue([openAI, legacy]);
  voice.setVoice.mockResolvedValue({ ready: true, voiceId: "marin" });
  await inVoiceSettings("space", async (container) => {
    expect(container.querySelector('input[type="password"]')).toBeNull();
    const select = container.querySelector("select")!;
    expect(select.value).toBe("alloy");
    expect([...select.options].map(({ value }) => value)).toEqual(["alloy", "marin"]);
    await act(async () => {
      select.value = "marin";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(voice.setVoice).toHaveBeenCalledExactlyOnceWith({
      scope: "space",
      provider: "openai",
      voiceId: "marin",
    });
  });
});
