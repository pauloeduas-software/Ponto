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

export const minutesToHHMM = (totalMins: number): string => {
  const absMins = Math.abs(totalMins);
  const hrs = Math.floor(absMins / 60);
  const mins = absMins % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
};

export const formatTimeInput = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "");
  let h = digits.slice(0, 2);
  let m = digits.slice(2, 4);
  if (h.length === 2 && parseInt(h) > 23) h = "23";
  if (m.length === 2 && parseInt(m) > 59) m = "59";
  return digits.length > 2 ? h + ":" + m : h;
};
