type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="py-18">
      <p className="m-0 font-bold text-accent">{eyebrow}</p>
      <h1 className="mb-4 text-[clamp(36px,6vw,64px)] font-bold tracking-[-0.05em]">
        {title}
      </h1>
      <p className="max-w-[680px] leading-relaxed text-brand-muted">{description}</p>
    </main>
  );
}
