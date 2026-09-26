const DESCRIPTION_SEPARATOR = ' — ';

interface Props {
  description: string;
}

export default function ProjectDescription({ description }: Props) {
  const lines = description.split(DESCRIPTION_SEPARATOR);

  return lines.map((line) => (
    <span key={line} className="block">
      {line}
    </span>
  ));
}
