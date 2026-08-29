export function hasAvailabilityFormChanged(initialValues: unknown, currentValues: unknown): boolean {
  if (!initialValues || !currentValues) return false;
  return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
}
