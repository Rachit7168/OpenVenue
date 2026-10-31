export interface Seat {
  x: number;
  z: number;
  /** Radians. The chair back points toward local +Z before this yaw. */
  yaw: number;
}

/** One chair per place along both long sides, facing the table. */
export function tableSeats(width: number, depth: number): Seat[] {
  const alongX = width >= depth;
  const span = alongX ? width : depth;
  const count = Math.min(6, Math.max(1, Math.round((span - 0.4) / 0.9)));
  const gap = span / (count + 1);
  const seats: Seat[] = [];
  for (let index = 1; index <= count; index += 1) {
    const along = -span / 2 + gap * index;
    if (alongX) {
      seats.push({ x: along, z: depth / 2 + 0.34, yaw: 0 });
      seats.push({ x: along, z: -(depth / 2 + 0.34), yaw: Math.PI });
    } else {
      seats.push({ x: width / 2 + 0.34, z: along, yaw: Math.PI / 2 });
      seats.push({ x: -(width / 2 + 0.34), z: along, yaw: -Math.PI / 2 });
    }
  }
  return seats;
}
