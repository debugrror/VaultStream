import { HTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          'rounded-xl border border-gray-200 bg-white shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge('border-b border-gray-200 px-6 py-4', className)}
        {...props}
      />
    );
  }
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={twMerge('text-lg font-semibold leading-6 text-gray-900', className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = 'CardTitle';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={twMerge('p-6', className)} {...props} />;
  }
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
