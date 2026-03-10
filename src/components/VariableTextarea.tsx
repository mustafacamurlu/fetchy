import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import VariableTooltip from './VariableTooltip';
import { useAppStore } from '../store/appStore';

interface VariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function VariableTextarea({ value, onChange, placeholder, className }: VariableTextareaProps) {
  const [tooltip, setTooltip] = useState<{ variableName: string; position: { x: number; y: number } } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState<{ x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const { getActiveEnvironment, collections, tabs, activeTabId } = useAppStore();

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeCollection = activeTab?.collectionId
    ? collections.find(c => c.id === activeTab.collectionId)
    : null;

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
    if (filtered.length > 0 && textareaRef.current) {
      const el = textareaRef.current;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      const font = `${computed.fontSize} ${computed.fontFamily}`;
      const paddingLeft = parseFloat(computed.paddingLeft);
      const paddingTop = parseFloat(computed.paddingTop);
      const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5;
      const textBeforeOpen = val.substring(0, lastOpenIdx);
      const lines = textBeforeOpen.split('\n');
      const lineIndex = lines.length - 1;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let textWidth = 0;
      if (ctx) {
        ctx.font = font;
        textWidth = ctx.measureText(lines[lineIndex]).width;
      }
      const x = rect.left + paddingLeft + textWidth - el.scrollLeft;
      const y = rect.top + paddingTop + (lineIndex + 1) * lineHeight - el.scrollTop;
      setSuggestionPos({ x, y });
    } else {
      setSuggestionPos(null);
    }
  }, [getActiveEnvironment, activeCollection]);

  const acceptSuggestion = useCallback((varName: string) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart ?? value.length;
    const textBefore = value.substring(0, cursorPos);
    const lastOpenIdx = textBefore.lastIndexOf('<<');
    if (lastOpenIdx === -1) return;
    const newValue = value.substring(0, lastOpenIdx) + `<<${varName}>>` + value.substring(cursorPos);
    onChange(newValue);
    setSuggestions([]);
    setSuggestionPos(null);
    const newCursorPos = lastOpenIdx + varName.length + 4;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Find variable at cursor position or clicked position
  const findVariableAtPosition = useCallback((text: string, cursorPos: number): string | null => {
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

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart || 0;
    const variableName = findVariableAtPosition(value, cursorPos);

    if (variableName) {
      const rect = textarea.getBoundingClientRect();
      // Get position relative to textarea
      const textBeforeCursor = value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const lineHeight = 20; // Approximate line height
      const charWidth = 8; // Approximate character width

      const currentLineIndex = lines.length - 1;
      const currentLineLength = lines[currentLineIndex].length;

      const offsetY = Math.min(currentLineIndex * lineHeight, rect.height - 50);
      const offsetX = Math.min(currentLineLength * charWidth, rect.width - 100);

      setTooltip({
        variableName,
        position: {
          x: rect.left + offsetX,
          y: rect.top + offsetY,
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Set cursor position after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleScroll = () => {
    // Sync scroll between textarea and overlay
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Highlight variables in the textarea
  const activeEnvironment = getActiveEnvironment();

  const getHighlightedContent = () => {
    if (!value) return null;

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const regex = /<<([^>]+)>>/g;
    let match;
    let keyIndex = 0;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = value.substring(lastIndex, match.index);
        parts.push(
          <span key={`text-${keyIndex++}`} className="text-fetchy-text whitespace-pre">
            {textBefore}
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
          key={`var-${keyIndex++}`}
          className={`whitespace-pre ${varClass}`}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${keyIndex++}`} className="text-fetchy-text whitespace-pre">
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : null;
  };

  const hasVariables = /<<[^>]+>>/.test(value);

  return (
    <div className="relative h-full w-full">
      {/* Actual textarea - make text transparent when variables exist so overlay shows through */}
      <textarea
        ref={textareaRef}
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
        placeholder={placeholder}
        className={`${className} h-full w-full resize-none font-mono text-sm p-4 bg-[var(--input-bg)] border-none outline-none`}
        style={hasVariables ? { color: 'transparent', caretColor: 'var(--text-color)' } : undefined}
        spellCheck={false}
      />

      {/* Overlay for highlighted variables */}
      {hasVariables && (
        <div
          ref={overlayRef}
          className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none font-mono text-sm p-4 overflow-hidden whitespace-pre-wrap break-all"
          style={{
            wordBreak: 'break-all',
          }}
        >
          {getHighlightedContent()}
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
