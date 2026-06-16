import Image from "next/image";

interface WpImageProps {
  src: string;
  auth?: string;
  className?: string;
  alt?: string;
}

export default function WpImage({ src, className, alt = "" }: WpImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={192}
      height={128}
      className={className}
    />
  );
}
