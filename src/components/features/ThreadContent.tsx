import { useNavigate } from 'react-router-dom';

interface ThreadContentProps {
  content: string;
  className?: string;
  expandable?: boolean;
}

export function ThreadContent({ content, className = '', expandable = false }: ThreadContentProps) {
  const navigate = useNavigate();

  const MAX_LEN = 280;
  const isLong = expandable && content.length > MAX_LEN;

  const parseContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match hashtags, mentions and URLs
    const regex = /(https?:\/\/[^\s]+|#\w+|@\w+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];

      if (token.startsWith('#')) {
        parts.push(
          <span
            key={`h-${match.index}`}
            className="content-hashtag"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/search?q=${encodeURIComponent(token)}`);
            }}
          >
            {token}
          </span>
        );
      } else if (token.startsWith('@')) {
        parts.push(
          <span
            key={`m-${match.index}`}
            className="content-mention"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${token.substring(1)}`);
            }}
          >
            {token}
          </span>
        );
      } else if (token.startsWith('http')) {
        parts.push(
          <a
            key={`u-${match.index}`}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {token.replace(/^https?:\/\//, '').replace(/\/$/, '').substring(0, 40)}
            {token.length > 40 ? '…' : ''}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const displayContent = isLong ? content.substring(0, MAX_LEN) + '…' : content;

  return (
    <p className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words ${className}`}>
      {parseContent(displayContent)}
    </p>
  );
}
