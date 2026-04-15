export function buildCommunicationComposePath(currentPath: string, to?: string, subject?: string) {
  const orgMatch = currentPath.match(/^\/org\/([^/]+)/);
  const basePath = orgMatch
    ? `/org/${orgMatch[1]}/communications/new`
    : "/communications/new";

  const params = new URLSearchParams();
  if (to && to.trim()) params.set("to", to.trim());
  if (subject && subject.trim()) params.set("subject", subject.trim());

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
