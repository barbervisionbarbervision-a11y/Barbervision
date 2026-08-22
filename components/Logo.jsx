import Image from "next/image";

const TAMANHOS = {
  sm: 96,
  md: 160,
  lg: 260
};

export default function Logo({ size = "md" }) {
  const largura = TAMANHOS[size];

  return (
    <Image
      src="/logo-barbervision.png"
      alt="Barber Vision"
      width={largura}
      height={largura}
      className="object-contain"
      priority
    />
  );
}
