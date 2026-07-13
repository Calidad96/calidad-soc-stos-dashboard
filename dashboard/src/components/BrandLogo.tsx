import Image from 'next/image';

/** User's Calidad logo — transparent PNG, contrast via CSS only */
export function BrandLogo() {
  return (
    <div className="brand-logo-wrap flex items-center justify-center px-0.5 py-1">
      <Image
        src="/calidad-logo.png"
        alt="Calidad Services, Inc. — Security and Technology"
        width={230}
        height={58}
        className="brand-logo-img h-auto w-full object-contain"
        priority
      />
    </div>
  );
}
