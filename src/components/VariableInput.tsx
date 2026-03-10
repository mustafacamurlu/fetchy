import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import VariableTooltip from './VariableTooltip';
import { useAppStore } from '../store/appStore';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

export default function VariableInput({ value, onChange, placeholder, className, type = 'text', onPaste }: VariableInputProps) {
  const [tooltip, setTooltip] = useState<{ variableName: string; position: { x: number; y: number } } | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { getActiveEnvironment, collections, tabs, activeTabId } = useAppStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeCollection = activeTab?.collectionId
    ? collections.find(c => c.id === activeTab.collectionId)
    : null;

  // Sync overlay padding/font from the input's computed styles so they align perfectly
  useEffect(() => {
    if (inputRef.current) {
      const computed = getComputedStyle(inputRef.current);
      setOverlayStyle({
        paddingLeft: computed.paddingLeft,
        paddingRight: computed.paddingRight,
        fontSize: computed.fontSize,
        fontFamily: computed.fontFamily,
        letterSpacing: computed.letterSpacing,
      });
    }
  }, [className]);

  // Sync scroll position between input and overlay
  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    const scrollPos = e.currentTarget.scrollLeft;
    setScrollLeft(scrollPos);
  };

  const computeSuggestions = useCallback((val: string, cursorPos: number) => {
    const textBefore = val.substring(0, cursorPos);
    const lastOpenIdx = textBefore.lastIndexOf('<<');
    if (lastOpenIdx === -1) {
      setSuggestions([]);
      setSuggestionPos(null);
      return;
    }
    const betweenText = textBefore.substring(lastOpenIdx + 2);
    if (betweenText.includes('>')) {
      setSuggestions([]);
      setSuggestionPos(null);
      return;
    }
    const partial = betweenText.toLowerCase();
    const envVars = getActiveEnvironment()?.variables.filter(v => v.enabled && v.key) ?? [];
    const colVars = activeCollection?.variables?.filter(v => v.enabled && v.key) ?? [];
    const envKeys = new Set(envVars.map(v => v.key));
    const allVars = [...envVars, ...colVars.filter(v => !envKeys.has(v.key))];
    const filtered = allVars
      .filter(v => v.key.toLowerCase().includes(partial))
      .map(v => v.key);
    setSuggestions(filtered);
    setSuggestionIndex(0);
    if (filtered.length > 0 && inputRef.current) {
      const el = inputRef.current;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      const font = `${computed.fontSize} ${computed.fontFamily}`;
      const paddingLeft = parseFloat(computed.paddingLeft);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let textWidth = 0;
      if (ctx) {
        ctx.font = font;
        textWidth = ctx.measureText(val.substring(0, lastOpenIdx)).width;
      }
      const x = rect.left + paddingLeft + textWidth - el.scrollLeft;
      setSuggestionPos({ x, y: rect.bottom });
    } else {
      setSuggestionPos(null);
    }
  }, [getActiveEnvironment, activeCollection]);

  const acceptSuggestion = useCallback((varName: string) => {
    if (!inputRef.current) return;
    const cursorPos = inputRef.current.selectionStart ?? value.length;
    const textBefore = value.substring(0, cursorPos);
    const lastOpenIdx = textBefore.lastIndexOf('<<');
    if (lastOpenIdx === -1) return;
    const newValue = value.substring(0, lastOpenIdx) + `<<${varName}>>` + value.substring(cursorPos);
    onChange(newValue);
    setSuggestions([]);
    setSuggestionPos(null);
    const newCursorPos = lastOpenIdx + varName.length + 4;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = newCursorPos;
        inputRef.current.selectionEnd = newCursorPos;
        inputRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Find variable at cursor position or clicked position
  const findVariableAtPosition = useCallback((text: string, cursorPos: number): string | null => {
    // Find all <<variable>> patterns
    const regex = /<<([^>]+)>>/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (cursorPos >= start && cursorPos <= end) {
        return match[1].trim();
      }
    }

    return null;
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorPos = input.selectionStart || 0;
    const variableName = findVariableAtPosition(value, cursorPos);

    if (variableName) {
      const rect = input.getBoundingClientRect();
      // Calculate approximate position of the clicked text
      const charWidth = 8; // Approximate character width
      const offsetX = Math.min(cursorPos * charWidth, rect.width - 100);

      setTooltip({
        variableName,
        position: {
          x: rect.left + offsetX,
          y: rect.bottom,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(i => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(i => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        setSuggestionPos(null);
        e.stopPropagation();
        return;
      }
    }
    // Close tooltip on Escape
    if (e.key === 'Escape' && tooltip) {
      setTooltip(null);
      e.stopPropagation();
    }
  };

  // Highlight variables in the input
  const activeEnvironment = getActiveEnvironment();

  const getHighlightedValue = () => {
    if (!value) return null;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const regex = /<<([^>]+)>>/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match (use same color as regular text)
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-fetchy-text">
            {value.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Check if variable is defined and whether it has a value
      const varName = match[1].trim();
      const variable = activeEnvironment?.variables.find(v => v.key === varName && v.enabled);
      const isDefined = !!variable;
      const isSecret = variable?.isSecret || false;
      const varValue = variable?.currentValue || variable?.value || variable?.initialValue || '';
      const isEmpty = isDefined && !varValue;

      const varClass = !isDefined
        ? 'var-highlight-undefined'
        : isEmpty
        ? 'var-highlight-empty'
        : isSecret
        ? 'var-highlight-secret'
        : 'var-highlight-defined';

      parts.push(
        <span
          key={`var-${match.index}`}
          className={varClass}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-fetchy-text">
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : null;
  };

  const hasVariables = /<<[^>]+>>/.test(value);

  // Check if this is being used as a flex item
  const isFlexItem = className?.includes('flex-1');

  return (
    <div className={`relative ${isFlexItem ? 'flex-1 min-w-0' : 'w-full'}`}>
      {/* Actual input - make text transparent when variables exist so overlay shows through */}
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          const cursor = e.target.selectionStart ?? e.target.value.length;
          computeSuggestions(e.target.value, cursor);
        }}
        onBlur={() => {
          setTimeout(() => {
            setSuggestions([]);
            setSuggestionPos(null);
          }, 150);
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        onPaste={onPaste}
        placeholder={placeholder}
        className={`${className} ${isFlexItem ? 'w-full' : ''}`}
        style={hasVariables ? { color: 'transparent', caretColor: 'white' } : undefined}
      />

      {/* Overlay for highlighted variables - must match input styling exactly */}
      {hasVariables && (
        <div
          className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none flex items-center"
          style={{
            paddingLeft: overlayStyle.paddingLeft,
            paddingRight: overlayStyle.paddingRight,
            overflow: 'hidden',
          }}
        >
          <div
            ref={overlayRef}
            style={{
              whiteSpace: 'nowrap',
              width: '100%',
              transform: `translateX(-${scrollLeft}px)`,
              fontSize: overlayStyle.fontSize,
              fontFamily: overlayStyle.fontFamily,
              letterSpacing: overlayStyle.letterSpacing,
            }}
          >
            {getHighlightedValue()}
          </div>
        </div>
      )}

      {/* Tooltip portal */}
      {tooltip && createPortal(
        <VariableTooltip
          variableName={tooltip.variableName}
          position={tooltip.position}
          onClose={() => setTooltip(null)}
        />,
        document.body
      )}

      {/* Variable suggestions dropdown */}
      {suggestionPos && suggestions.length > 0 && createPortal(
        <div
          className="fixed z-[9999] bg-fetchy-card border border-fetchy-border rounded-lg shadow-xl overflow-auto"
          style={{
            top: suggestionPos.y + 4,
            left: Math.min(suggestionPos.x, window.innerWidth - 200),
            maxHeight: '200px',
            minWidth: '160px',
          }}
        >
          {suggestions.map((name, i) => (
            <div
              key={name}
              className={`px-3 py-1.5 text-sm cursor-pointer font-mono ${
                i === suggestionIndex
                  ? 'bg-fetchy-accent/20 text-fetchy-accent'
                  : 'text-fetchy-text hover:bg-fetchy-hover'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                acceptSuggestion(name);
              }}
            >
              <span className="opacity-50">{`<<`}</span>{name}<span className="opacity-50">{`>>`}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
