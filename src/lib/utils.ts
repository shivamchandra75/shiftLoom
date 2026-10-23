export function getFormattedDate(dateString?: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 0) return "Just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 60) return `${Math.max(1, diffInMinutes)}min`;
  if (diffInHours < 24) return `${diffInHours}h`;
  if (diffInDays < 7) return `${diffInDays}d`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInDays < 30) return `${diffInWeeks}w`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInDays < 365) return `${diffInMonths}mo`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y`;
}


export function formatDate(dateString: string):string {
  const parts = dateString.split("-");
  const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // "29-09-2026"
  return formattedDate;
};

export function formatTimeTo12Hour(time24: string) {
  const [hourStr, minuteStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  hour = hour ? hour : 12;

  return `${hour}:${minuteStr} ${ampm}`;
}

// True when the job date is more than 2 days away (cancellation window for workers and admins).
export function canCancelShift(jobDateStr: string): boolean {
  if (!jobDateStr) return false;
  const [year, month, day] = jobDateStr.split('-').map(Number);
  const jobDate = new Date(year, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = jobDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 2;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// Local YYYY-MM-DD, same format as jobs.job_date
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Local HH:MM, same format as jobs.start_time / end_time
export const toHm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
