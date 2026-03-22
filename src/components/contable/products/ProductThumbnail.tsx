import { ImageOff, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductThumbnailProps {
  imageUrl?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
  roundedClassName?: string;
}

const ProductThumbnail = ({
  imageUrl,
  name,
  className,
  iconClassName,
  roundedClassName
}: ProductThumbnailProps) => {
  if (imageUrl) {
    return (
      <div className={cn("product-thumb", roundedClassName, className)}>
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';
            const fallback = target.parentElement?.querySelector('[data-fallback="true"]');
            if (fallback instanceof HTMLElement) {
              fallback.style.display = 'flex';
            }
          }}
        />
        <div
          data-fallback="true"
          className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-muted via-accent/40 to-muted"
        >
          <ImageOff className={cn("h-6 w-6 text-muted-foreground", iconClassName)} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("product-thumb flex items-center justify-center bg-gradient-to-br from-muted via-accent/30 to-muted", roundedClassName, className)}>
      <Package className={cn("h-6 w-6 text-muted-foreground", iconClassName)} />
    </div>
  );
};

export default ProductThumbnail;
