import type { CredentialStore } from "@earendil-works/pi-ai";
import { createModels, type MutableModels, type Provider } from "@earendil-works/pi-ai";
import { openaiCodexProvider } from "@earendil-works/pi-ai/providers/openai-codex";

export type TextGenerator = Readonly<{
  complete: (prompt: string, modelId?: string, signal?: AbortSignal) => Promise<string>;
}>;

export class CodexClient implements TextGenerator {
  readonly provider: Provider<"openai-codex-responses">;
  private readonly models: MutableModels;

  constructor(credentials: CredentialStore) {
    this.provider = openaiCodexProvider();
    this.models = createModels({ credentials });
    this.models.setProvider(this.provider);
  }

  modelIds(): string[] {
    return this.provider.getModels().map((model) => model.id);
  }

  async complete(prompt: string, modelId?: string, signal?: AbortSignal): Promise<string> {
    const model =
      this.provider.getModels().find((item) => item.id === modelId) ?? this.provider.getModels()[0];
    if (!model) {
      throw new Error("No Codex model is available");
    }
    const options = signal ? { signal, reasoning: "low" as const } : { reasoning: "low" as const };
    const message = await this.models.completeSimple(
      model,
      { messages: [{ role: "user", content: prompt, timestamp: Date.now() }] },
      options,
    );
    if (message.stopReason === "error") {
      throw new Error(message.errorMessage ?? "Codex request failed");
    }
    return message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
  }
}
