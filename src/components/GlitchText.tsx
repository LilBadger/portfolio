type GlitchTextProps = {
  text: string;
  as?: 'span' | 'div';
  className?: string;
  intensity?: 'normal' | 'heavy';
};

export function GlitchText({ text, as = 'span', className = '', intensity = 'normal' }: GlitchTextProps) {
  const Tag = as;
  return (
    <Tag
      className={`glitch-text glitch-text--${intensity} ${className}`.trim()}
      data-text={text}
    >
      {text}
    </Tag>
  );
}
