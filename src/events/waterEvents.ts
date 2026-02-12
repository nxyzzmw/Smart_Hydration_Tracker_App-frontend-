type Listener = () => void;

const listeners = new Set<Listener>();

export function emitWaterChanged() {
  listeners.forEach((listener) => listener());
}

export function subscribeWaterChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
