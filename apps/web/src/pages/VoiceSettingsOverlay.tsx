import { Trans, useLingui } from "@lingui/react/macro";
import type { SettingsScope, VoiceInfo } from "@rakazo/contracts";
import { OPENAI_VOICE_PROVIDER_ID as provider } from "@rakazo/contracts";
import { fetchFresh } from "@rakazo/core/query";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  NativeSelect,
  NativeSelectOption,
  Spinner,
} from "@rakazo/ui-web";
import { useQueryClient } from "@tanstack/react-query";
import { XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LiveCallModelPicker } from "../components/call/LiveCallModelPicker";
import { useSpaceQueries } from "../lib/query";
import { useBoundSpaceId, useSpaceRpc } from "../lib/space-rpc";
import { speaker } from "../lib/tts";
import { errorText } from "../lib/user-error";

export function VoiceSettingsOverlay({
  onClose,
  embedded = false,
  onBusyChange,
  scope,
}: {
  onClose: () => void;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  scope: SettingsScope;
}) {
  const rpc = useSpaceRpc();
  const spaceId = useBoundSpaceId();
  const queries = useSpaceQueries();
  const queryClient = useQueryClient();
  const scoped = { input: { scope } };
  const voiceInput = { input: { provider, scope } };
  const { t } = useLingui();
  const apiKeyId = useId();
  const voiceSelectId = useId();
  const [credentials, setCredentials] = useState(() =>
    queryClient.getQueryData(queries.voice.credentials.queryKey(scoped)),
  );
  const [voices, setVoices] = useState<VoiceInfo[]>(
    () => queryClient.getQueryData(queries.voice.voices.queryKey(voiceInput)) ?? [],
  );
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(!credentials);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const credential = credentials?.find((entry) => entry.provider === provider);
  const voiceId = voices.some((entry) => entry.id === credential?.voiceId)
    ? credential?.voiceId
    : "";

  async function refresh(reuse = false) {
    const version = ++refreshVersion.current;
    const [nextCredentials] = await Promise.all([
      fetchFresh(queryClient, queries.voice.credentials.queryOptions(scoped), { reuse }),
      fetchFresh(queryClient, queries.voice.status.queryOptions(scoped), { reuse }),
    ]);
    if (version !== refreshVersion.current) return;
    setCredentials(nextCredentials);
    const connected = nextCredentials.some((entry) => entry.provider === provider);
    const nextVoices = connected
      ? await fetchFresh(queryClient, queries.voice.voices.queryOptions(voiceInput), { reuse })
      : [];
    if (version === refreshVersion.current) setVoices(nextVoices);
  }

  useEffect(() => {
    void refresh(true)
      .catch((err: unknown) => setError(errorText(err, t`Could not load voice settings`)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  async function changeVoiceSettings(
    action: () => Promise<unknown>,
    errorMessage: string,
    clearKey = false,
  ) {
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      if (clearKey) setApiKey("");
      await refresh();
    } catch (err) {
      setError(errorText(err, errorMessage));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function testVoice() {
    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    setNotice(null);
    try {
      await speaker.speak(t`Hi, this is how I'll sound when I read replies out loud.`, {
        spaceId,
        scope,
      });
      if (speaker.state.error) setError(speaker.state.error);
      else setNotice(t`If you heard that, voice is ready.`);
    } catch (err) {
      setError(errorText(err, t`Could not play a test clip`));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const content = (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Daily Bot uses OpenAI for voice. Other providers can be added on request.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      ) : null}
      {loading ? (
        <div className="grid place-items-center py-6">
          <Spinner className="size-5 text-muted-foreground" aria-label="Loading voice settings…" />
        </div>
      ) : (
        <>
          {scope === "account" || !credential ? (
            <Field>
              <FieldLabel htmlFor={apiKeyId}>OpenAI API key</FieldLabel>
              <Input
                id={apiKeyId}
                type="password"
                autoComplete="new-password"
                value={apiKey}
                disabled={busy}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={credential ? "Key connected" : t`Paste your API key`}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy || apiKey.trim().length < 8}
                  onClick={() =>
                    void changeVoiceSettings(
                      () =>
                        rpc.voice.connect({
                          scope,
                          provider,
                          apiKey: apiKey.trim(),
                          voiceId: voiceId || undefined,
                        }),
                      "Could not connect the OpenAI key",
                      true,
                    )
                  }
                >
                  {credential ? <Trans>Replace key</Trans> : <Trans>Connect</Trans>}
                </Button>
                {credential ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void changeVoiceSettings(
                        () => rpc.voice.disconnect({ provider }),
                        "Could not disconnect the OpenAI key",
                        true,
                      )
                    }
                  >
                    <Trans>Disconnect</Trans>
                  </Button>
                ) : null}
              </div>
            </Field>
          ) : null}
          {credential && voices.length ? (
            <Field>
              <FieldLabel htmlFor={voiceSelectId}>
                <Trans>Voice</Trans>
              </FieldLabel>
              <NativeSelect
                id={voiceSelectId}
                className="w-full"
                value={voiceId}
                disabled={busy}
                onChange={(event) => {
                  const choice = event.target.value;
                  void changeVoiceSettings(
                    () => rpc.voice.setVoice({ scope, provider, voiceId: choice }),
                    t`Could not save that voice`,
                  );
                }}
              >
                {!voiceId ? (
                  <NativeSelectOption value="" disabled>
                    Choose a voice
                  </NativeSelectOption>
                ) : null}
                {voices.map((voice) => (
                  <NativeSelectOption key={voice.id} value={voice.id}>
                    {voice.label}
                    {voice.description ? ` (${voice.description})` : ""}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !voiceId}
                onClick={() => void testVoice()}
              >
                <Trans>Hear a sample</Trans>
              </Button>
            </Field>
          ) : null}
          {scope === "account" ? (
            <Field>
              <LiveCallModelPicker />
              <p className="text-sm text-muted-foreground">
                For live calls, use a key with Realtime access. OpenAI receives call audio and
                recent chat context.
              </p>
            </Field>
          ) : null}
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div data-testid="voice-settings">{content}</div>;
  }

  return (
    <Dialog
      open
      onOpenChange={(open, details) => {
        if (open) return;
        if (busy) {
          details.cancel();
          return;
        }
        onClose();
      }}
    >
      <DialogContent
        data-testid="voice-settings"
        aria-describedby={undefined}
        showCloseButton={false}
        className="flex h-[min(680px,calc(100%-2rem))] w-[920px] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:h-[min(680px,calc(100%-5rem))] sm:max-w-[calc(100%-5rem)]"
      >
        <div className="flex items-start justify-between px-6 pt-6 sm:px-8 sm:pt-7">
          <DialogTitle className="text-heading2 font-medium text-foreground">
            <Trans>Voice</Trans>
          </DialogTitle>
          <DialogClose
            aria-label={t`Close voice settings`}
            disabled={busy}
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <XIcon />
          </DialogClose>
        </div>
        <div className="rk-scroll min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="max-w-xl">{content}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
