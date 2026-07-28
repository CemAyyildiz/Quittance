export function formatStroops(stroops: string | number): string {
  const value = Number(stroops);
  if (isNaN(value) || stroops === "") {
    throw new Error("Invalid input");
  }
  return (value / 10000000).toFixed(7);
}
