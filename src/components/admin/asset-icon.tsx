import Image from "next/image";

export function AssetImage({
  name,
  width,
  height,
  className,
}: {
  name: string;
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <Image
      src={`/images/admin/${name}.svg`}
      alt=""
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
