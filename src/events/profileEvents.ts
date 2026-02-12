type Listener = () => void;

const listeners = new Set<Listener>();

export function emitProfileChanged() {
  listeners.forEach((listener) => listener());
}

export function subscribeProfileChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
