export function newId(prefix: string) {
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const hex = [...rand].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

export function snapshotId(vehicleId: string, date: string) {
  return `snp_${vehicleId}_${date}`;
}
