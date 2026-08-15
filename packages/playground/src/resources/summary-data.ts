import type { DataProviderDefinition } from '@softov/scena/types';

// Eager summary counters. Loaded at boot (well — at register-shell time,
// which is right after sign-in), so activitybar badges + statusbar values
// have something to read BEFORE any resource explorer is opened.
//
// The full resource providers (users / teams) stay lazy and update these
// counts to the real value when they load. The summary provider here is
// the "initial guess + always-available" source.
//
// In a real app this hits `/api/summary` or similar — counts + notification
// totals + pending alerts. Here we hardcode mock values.
export const summaryDataProvider: DataProviderDefinition = {
  namespace: 'summary',
  load: 'eager',
  provider: {
    load(store) {
      store.set('$/summary/users/total', 4);
      store.set('$/summary/teams/total', 2);
      // Example of an alert-style badge (no resource provider behind it —
      // pure summary data). Wire any activitybar entry to this path to
      // demonstrate the pattern.
      store.set('$/summary/channels/pending', 2);
    },
  },
};
