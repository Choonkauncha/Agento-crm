/** Only the newest authorized day request may update the Shifts screen. */
export function createShiftDayLoader({ fetchDay, isAuthorized, onLoading, onSuccess, onError }) {
  let generation = 0;
  return {
    invalidate() { generation += 1; },
    async load(date, { quiet = false } = {}) {
      const ticket = ++generation;
      const current = () => ticket === generation && isAuthorized();
      if (!current()) return;
      if (!quiet) onLoading(date);
      try {
        const data = await fetchDay(date);
        if (current()) onSuccess(data, date, { quiet });
      } catch (error) {
        if (current() && !quiet) onError(error, date);
      }
    }
  };
}
