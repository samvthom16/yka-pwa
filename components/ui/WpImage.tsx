interface WpImageProps {
  src: string;
  auth?: string;
  className?: string;
  alt?: string;
}

// eslint-disable-next-line @next/next/no-img-element
export default function WpImage({ src, className, alt = "" }: WpImageProps) {
  return <img src={src} alt={alt} className={className} />;
}
