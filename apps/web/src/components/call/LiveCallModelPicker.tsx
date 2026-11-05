import { NativeSelect, NativeSelectOption } from "@rakazo/ui-web";
import { useId, useState } from "react";
import {
  readBotRealtimeCallChoice,
  readRealtimeCallModel,
  saveRealtimeCallModel,
} from "../../lib/realtime-call-preference";

export function LiveCallModelPicker({ botId }: { botId?: string }) {
  const id = useId();
  const [model, setModel] = useState<string>(() =>
    botId ? readBotRealtimeCallChoice(botId) : (readRealtimeCallModel() ?? ""),
  );
  const [saveFailed, setSaveFailed] = useState(false);

  return (
    <div className="space-y-2">
      <label className="block text-sm text-foreground" htmlFor={id}>
        Live call model
      </label>
      <NativeSelect
        id={id}
        className="w-full"
        value={model}
        onChange={(event) => {
          const value = event.target.value;
          const saved = saveRealtimeCallModel(value, botId);
          if (saved) setModel(value);
          setSaveFailed(!saved);
        }}
      >
        {botId ? <NativeSelectOption value="">Use Voice settings</NativeSelectOption> : null}
        <NativeSelectOption value={botId ? "chat" : ""}>
          Standard call (OpenAI speech)
        </NativeSelectOption>
        <NativeSelectOption value="gpt-realtime-2.1-mini">
          OpenAI Realtime 2.1 Mini
        </NativeSelectOption>
        <NativeSelectOption value="gpt-realtime-2.1">OpenAI Realtime 2.1</NativeSelectOption>
      </NativeSelect>
      {saveFailed ? <p role="alert">Could not save the call model in this browser.</p> : null}
    </div>
  );
}
