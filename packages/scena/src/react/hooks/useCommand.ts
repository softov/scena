import { useCallback } from 'react';
import { useScena } from '../ScenaProvider.js';

export function useCommand(id: string): (args?: unknown) => Promise<unknown> {
  const scena = useScena();
  return useCallback((args?: unknown) => scena.commands.execute(id, args), [scena, id]);
}
