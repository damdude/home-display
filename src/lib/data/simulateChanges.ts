import type { BinarySensorState } from './placeholder.js';

export type DoorKey = 'mainDoor' | 'sideDoor' | 'backPerimeter' | 'frontSidePerimeter';

const FRIENDLY_NAMES: Record<DoorKey, string> = {
  mainDoor:           'Main Door',
  sideDoor:           'Side Door',
  backPerimeter:      'Back Perimeter',
  frontSidePerimeter: 'Front-Side Perimeter',
};

const DOOR_KEYS = Object.keys(FRIENDLY_NAMES) as DoorKey[];

/**
 * Fires a random door state-change every 10–15 seconds.
 * Returns a cleanup/stop function.
 *
 * In Phase 1b this will be replaced by live HA subscription events.
 */
export function startDoorSimulation(
  onDoorChange: (key: DoorKey, newState: BinarySensorState) => void,
): () => void {
  const current: Record<DoorKey, 'on' | 'off'> = {
    mainDoor:           'off',
    sideDoor:           'off',
    backPerimeter:      'off',
    frontSidePerimeter: 'off',
  };

  let timerId: ReturnType<typeof setTimeout>;

  function scheduleNext() {
    const delay = 10_000 + Math.random() * 5_000; // 10–15 s
    timerId = setTimeout(() => {
      const key = DOOR_KEYS[Math.floor(Math.random() * DOOR_KEYS.length)];
      const next: 'on' | 'off' = current[key] === 'off' ? 'on' : 'off';
      current[key] = next;
      onDoorChange(key, {
        state: next,
        attributes: { device_class: 'door', friendly_name: FRIENDLY_NAMES[key] },
      });
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  return () => clearTimeout(timerId);
}
