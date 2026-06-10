export const formatTimelineForExcel = (jsonStr: string | null | undefined): string => {
  if (!jsonStr) return '';
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].hasOwnProperty('timestamp')) {
      return parsed
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((t: any) => {
          const date = new Date(t.timestamp);
          const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          return `[${dateStr}] ${t.author}: ${t.content}`;
        }).join('\n');
    }
  } catch (e) {}
  
  // Strip HTML as fallback for legacy content
  return jsonStr.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};
