export const timeToMinutes = (time: string): number => {
  if (!time) return 0;
  const [hrs, mins] = time.split(":").map(Number);
  return (hrs || 0) * 60 + (mins || 0);
};

export const minutesToTime = (totalMins: number): string => {
  const absMins = Math.abs(totalMins);
  const hrs = Math.floor(absMins / 60);
  const mins = absMins % 60;
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
};
