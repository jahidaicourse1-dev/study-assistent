export type ChatBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'divider' };

export type InlineSegment = {
  text: string;
  bold: boolean;
};

export function cleanMathDelimiters(input: string): string {
  return input.replace(/\$\$([^$]+)\$\$/g, '$1').replace(/\$([^$\n]+)\$/g, '$1');
}

export function parseInlineSegments(text: string): InlineSegment[] {
  const cleaned = cleanMathDelimiters(text);
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  const segments: InlineSegment[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else {
      segments.push({ text: part, bold: false });
    }
  }

  return segments;
}

export function parseTutorBlocks(rawText: string): ChatBlock[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const blocks: ChatBlock[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'list', items: listBuffer });
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      flushList();
      blocks.push({ type: 'divider' });
      continue;
    }

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push({ type: 'heading', text: headingMatch[1].trim() });
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/) || line.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1].trim());
      continue;
    }

    flushList();
    blocks.push({ type: 'paragraph', text: line });
  }

  flushList();
  return blocks;
}
