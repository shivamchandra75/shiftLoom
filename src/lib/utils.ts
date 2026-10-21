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
