import Image from "next/image";

/**
 * Marca visual da Agenda sobre o fundo claro das páginas (public/logo-preto.png).
 */
export function BrandLogo() {
  return (
    <Image
      src="/logo-preto.png"
      alt=""
      width={28}
      height={28}
      className="size-7 shrink-0"
    />
  );
}
