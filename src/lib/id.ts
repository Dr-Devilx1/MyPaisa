/**
 * Collision-safe ID generator.
 *
 * BUGFIX: the old code used `tx-${Date.now()}` everywhere. Two records created
 * inside the same millisecond (e.g. a Hostel entry that also writes a
 * transaction, or a bulk import) produced DUPLICATE IDs, which made
 * delete/update hit the wrong row.
 */
let counter = 0;

export function uid(prefix: string): string {
  counter = (counter + 1) % 0xffff;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = counter.toString(36).padStart(3, '0');
  return `${prefix}-${time}${seq}${rand}`;
}
