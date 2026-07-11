interface DialogOption {
  id: string;
  label: string;
  description?: string;
}

type DialogOptions = Readonly<{
  placeholder?: string;
  secret?: boolean;
  choices?: readonly DialogOption[];
  signal?: AbortSignal;
}>;

const createDialogShell = (title: string, message: string) => {
  const overlay = document.createElement("div");
  overlay.className = "inkdrop-codex-overlay";
  const dialog = document.createElement("form");
  dialog.className = "inkdrop-codex-dialog";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = message;
  dialog.append(heading, copy);
  return { dialog, overlay };
};

const appendChoiceButtons = (
  dialog: HTMLFormElement,
  choices: readonly DialogOption[],
  select: (value: string) => void,
): void => {
  const list = document.createElement("div");
  list.className = "inkdrop-codex-options";
  const buttons = choices.map((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.title = option.description ?? option.label;
    button.onclick = () => select(option.id);
    return button;
  });
  list.append(...buttons);
  dialog.append(list);
};

const appendTextControls = (
  dialog: HTMLFormElement,
  options: DialogOptions,
  cancel: () => void,
): HTMLInputElement => {
  const input = document.createElement("input");
  input.type = options.secret ? "password" : "text";
  input.placeholder = options.placeholder ?? "";
  const actions = document.createElement("div");
  actions.className = "inkdrop-codex-actions";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.onclick = cancel;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Continue";
  actions.append(cancelButton, submit);
  dialog.append(input, actions);
  return input;
};

export class DialogService {
  private active: Readonly<{ cancel: () => void; overlay: HTMLElement }> | null = null;

  close(): void {
    this.active?.cancel();
  }

  prompt(title: string, message: string, options: DialogOptions = {}): Promise<string> {
    this.close();
    return new Promise((resolve, reject) => {
      const { dialog, overlay } = createDialogShell(title, message);
      let settled = false;
      const cleanup = () => {
        overlay.remove();
        if (this.active?.overlay === overlay) {
          this.active = null;
        }
      };
      const succeed = (value: string) => {
        if (settled) {
          return;
        }
        settled = true;
        options.signal?.removeEventListener("abort", cancel);
        cleanup();
        resolve(value);
      };
      const cancel = () => {
        if (settled) {
          return;
        }
        settled = true;
        options.signal?.removeEventListener("abort", cancel);
        cleanup();
        reject(new Error("Cancelled"));
      };
      const input = options.choices ? undefined : appendTextControls(dialog, options, cancel);
      if (options.choices) {
        appendChoiceButtons(dialog, options.choices, succeed);
      }
      dialog.onsubmit = (event) => {
        event.preventDefault();
        succeed(input?.value ?? options.choices?.[0]?.id ?? "");
      };
      overlay.onclick = (event) => {
        if (event.target === overlay) {
          cancel();
        }
      };
      options.signal?.addEventListener("abort", cancel, { once: true });
      overlay.append(dialog);
      document.body.append(overlay);
      this.active = { cancel, overlay };
      input?.focus();
    });
  }

  info(title: string, message: string): void {
    this.prompt(title, message, { choices: [{ id: "ok", label: "OK" }] }).catch(() => undefined);
  }
}
