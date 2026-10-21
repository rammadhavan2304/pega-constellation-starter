type DiagnosticHandler = (message: string) => void;

let installed = false;
let handlers: DiagnosticHandler[] = [];

const serialize = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name}: ${value.message}`;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export function installPegaRenderDiagnostics(handler: DiagnosticHandler) {
  handlers = [...handlers, handler];

  if (installed) {
    return () => {
      handlers = handlers.filter((item) => item !== handler);
    };
  }

  installed = true;
  const originalConsoleError = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    const message = args.map(serialize).join(' ');
    const isPegaRenderError =
      message.includes("react_pconnect: getComponent doesn't have an entry for type") ||
      message.includes('Unable to load the component') ||
      message.includes('Error while Rendering the component');

    if (isPegaRenderError) {
      handlers.forEach((item) => item(message.slice(0, 1600)));
    }

    originalConsoleError(...args);
  };

  return () => {
    handlers = handlers.filter((item) => item !== handler);
  };
}
