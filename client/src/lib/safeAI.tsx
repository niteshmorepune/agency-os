import DOMPurify from 'dompurify';

interface SafeAIOutputProps {
  content: string;
  className?: string;
}

export function SafeAIOutput({ content, className }: SafeAIOutputProps) {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'code', 'pre'],
    ALLOWED_ATTR: [],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
