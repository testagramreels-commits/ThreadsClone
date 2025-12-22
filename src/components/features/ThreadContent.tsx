import { useNavigate } from 'react-router-dom';

interface ThreadContentProps {
  content: string;
  className?: string;
}

export function ThreadContent({ content, className = '' }: ThreadContentProps) {
  const navigate = useNavigate();

  const parseContent = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(#\w+|@\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const token = match[0];
      if (token.startsWith('#')) {
        // Hashtag
        parts.push(
          <span
            key={match.index}
            className="text-primary hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to search with hashtag
              navigate(`/search?q=${encodeURIComponent(token)}`);
            }}
          >
            {token}
          </span>
        );
      } else if (token.startsWith('@')) {
        // Mention
        parts.push(
          <span
            key={match.index}
            className="text-primary hover:underline cursor-pointer font-medium"
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to user profile
              navigate(`/profile/${token.substring(1)}`);
            }}
          >
            {token}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <p className={`text-base leading-relaxed whitespace-pre-wrap ${className}`}>
      {parseContent(content)}
    </p>
  );
}
